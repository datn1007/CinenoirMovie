package com.movie_be.movie.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.movie_be.movie.dto.TicketSellingRequest;
import com.movie_be.movie.dto.TicketSellingResponse;
import com.movie_be.movie.entity.account.Account;
import com.movie_be.movie.entity.invoice.Invoice;
import com.movie_be.movie.entity.member.Member;
import com.movie_be.movie.entity.movie.Movie;
import com.movie_be.movie.entity.schedule.Schedule;
import com.movie_be.movie.entity.schedule.ScheduleSeat;
import com.movie_be.movie.repository.AccountRepository;
import com.movie_be.movie.repository.InvoiceRepository;
import com.movie_be.movie.repository.MemberRepository;
import com.movie_be.movie.repository.MovieRepository;
import com.movie_be.movie.repository.ScheduleRepository;
import com.movie_be.movie.repository.ScheduleSeatRepository;
import com.movie_be.movie.service.TicketSellingService;
import com.movie_be.movie.service.VoucherService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TicketSellingServiceImpl implements TicketSellingService {

    private static final BigDecimal TICKET_PRICE_NORMAL = new BigDecimal("100000");
    private static final BigDecimal TICKET_PRICE_VIP = new BigDecimal("150000");
    private static final BigDecimal EARNED_SCORE_RATE = new BigDecimal("0.05"); // 5%

    private final MovieRepository movieRepository;
    private final ScheduleRepository scheduleRepository;
    private final MemberRepository memberRepository;
    private final ScheduleSeatRepository scheduleSeatRepository;
    private final InvoiceRepository invoiceRepository;
    private final AccountRepository accountRepository;
    private final VoucherService voucherService;

    @Override
    @Transactional
    public TicketSellingResponse sellTicket(TicketSellingRequest request) {
        // 1. Validate movie
        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new IllegalArgumentException("Movie not found: " + request.getMovieId()));
        // 2. Validate showtime as a full showtime: movie + date + time + room
        Integer showtimeId = request.getShowtimeId() != null ? request.getShowtimeId() : request.getScheduleId();
        if (showtimeId == null) {
            throw new IllegalArgumentException("showtimeId is required");
        }

        Schedule schedule = scheduleRepository.findById(showtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Showtime not found: " + showtimeId));
        if (schedule.getMovieId() == null || !schedule.getMovieId().equals(request.getMovieId())) {
            throw new IllegalArgumentException("Showtime does not belong to movie: " + request.getMovieId());
        }

        // 3. Validate member / account
        Member member = null;
        Account account = null;
        if (request.getMemberId() != null && !request.getMemberId().isBlank()) {
            member = memberRepository.findById(request.getMemberId())
                    .orElseThrow(() -> new IllegalArgumentException("Member not found: " + request.getMemberId()));
            account = member.getAccount();
            if (account == null) {
                throw new IllegalArgumentException("Member has no linked account");
            }
        } else if (request.getAccountId() != null && !request.getAccountId().isBlank()) {
            account = accountRepository.findById(request.getAccountId()).orElse(null);
            if (account != null) {
                member = memberRepository.findByAccount_AccountId(account.getAccountId()).orElse(null);
            }
        }

        // 4. Validate and reserve seats
        if (request.getSelectedSeats() == null || request.getSelectedSeats().isEmpty()) {
            throw new IllegalArgumentException("selectedSeats is required");
        }

        List<String> normalizedSeats = request.getSelectedSeats();
        List<ScheduleSeat> toSave = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (String seatCode : normalizedSeats) {
            int[] parts = parseSeatCode(seatCode);
            int seatRow = parts[0];
            String seatColumn = String.valueOf((char) parts[1]);
            List<ScheduleSeat> candidates = scheduleSeatRepository
                    .findAllByShowtimeIdAndSeatRowAndSeatColumnIn(
                            showtimeId,
                            seatRow,
                            java.util.Collections.singletonList(seatColumn));
            if (candidates.isEmpty()) {
                candidates = scheduleSeatRepository.findAllByScheduleIdAndSeatRowAndSeatColumnIn(
                        showtimeId,
                        seatRow,
                        java.util.Collections.singletonList(seatColumn));
                for (ScheduleSeat candidate : candidates) {
                    candidate.setShowtimeId(showtimeId);
                }
            }

            ScheduleSeat ss = candidates.stream()
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Seat not found in showtime: " + seatCode));

            if (ss.getSeatStatus() != null && ss.getSeatStatus() == 1) {
                throw new IllegalStateException("Seat already booked: " + seatCode);
            }
            if (ss.getHeldUntil() != null && ss.getHeldUntil().isAfter(LocalDateTime.now())) {
                throw new IllegalStateException("Seat is being held by an online customer: " + seatCode);
            }
            ss.setHeldBy(null);
            ss.setHeldUntil(null);

            // Calculate price based on seat type
            Short seatType = ss.getSeatType() != null ? ss.getSeatType() : 1;
            BigDecimal seatPrice = (seatType == 2) ? TICKET_PRICE_VIP : TICKET_PRICE_NORMAL;
            totalAmount = totalAmount.add(seatPrice);

            ss.setSeatStatus((short) 1);
            toSave.add(ss);
        }

        scheduleSeatRepository.saveAll(toSave);

        // 5. Handle score: calculate earned score, deduct used score
        int useScoreVal = request.getUseScore() != null ? request.getUseScore() : 0;
        int earnedScore = 0;
        int currentScore = 0;
        int remainingScore = 0;

        if (member != null) {
            currentScore = member.getScore() != null ? member.getScore() : 0;

            // Deduct used score
            if (useScoreVal > 0) {
                if (currentScore < useScoreVal) {
                    throw new IllegalArgumentException(
                            "Insufficient score. Current: " + currentScore + ", requested: " + useScoreVal);
                }
                currentScore -= useScoreVal;
            }

            // Calculate earned score (5% of total amount)
            earnedScore = totalAmount.multiply(EARNED_SCORE_RATE).intValue();

            // Update member score: current - used + earned
            remainingScore = currentScore + earnedScore;
            member.setScore(remainingScore);
            memberRepository.save(member);
        }

        // 6. Apply voucher discount (if provided)
        String voucherCode = request.getVoucherCode();
        if (voucherCode != null && !voucherCode.isBlank()) {
            BigDecimal discount = voucherService.applyVoucher(voucherCode, totalAmount);
            totalAmount = totalAmount.subtract(discount);
            if (totalAmount.compareTo(BigDecimal.ZERO) < 0) totalAmount = BigDecimal.ZERO;
        }

        // 7. Determine showDate from the selected schedule
        LocalDate showDate = schedule.getShowDate() != null ? schedule.getShowDate() : LocalDate.now();

        // 8. Create invoice
        String seatCsv = String.join(",", normalizedSeats);

        Invoice invoice = new Invoice();
        invoice.setInvoiceId(generateNextInvoiceId());
        invoice.setBookingDate(LocalDateTime.now());
        invoice.setMovieName(movie.getMovieNameVn());
        invoice.setScheduleShow(showDate);
        invoice.setScheduleShowTime(schedule.getScheduleTime());
        invoice.setSeat(seatCsv);
        invoice.setAddScore(earnedScore);
        invoice.setUseScore(useScoreVal);
        invoice.setTotalMoney(totalAmount);
        invoice.setStatus((short) 1); // confirmed immediately on online booking
        invoice.setAccount(account);

        invoiceRepository.save(invoice);

        // 8. Build response
        return TicketSellingResponse.builder()
                .invoiceId(invoice.getInvoiceId())
                .movieName(movie.getMovieNameVn())
                .showDate(showDate.toString())
                .showTime(schedule.getScheduleTime())
                .seats(seatCsv)
                .usedScore(useScoreVal)
                .remainingScore(remainingScore)
                .totalAmount(totalAmount)
                .build();
    }

    private int[] parseSeatCode(String seatCode) {
        if (seatCode == null || seatCode.length() < 2)
            throw new IllegalArgumentException("Invalid seat code: " + seatCode);
        char rowChar = seatCode.charAt(0);
        if (rowChar < 'A' || rowChar > 'H') {
            throw new IllegalArgumentException("Invalid seat row: " + rowChar);
        }
        int seatRow = (rowChar - 'A') + 1;
        int colNumber = Integer.parseInt(seatCode.substring(1));
        if (colNumber < 1 || colNumber > 12) {
            throw new IllegalArgumentException("Invalid seat column number: " + colNumber);
        }
        char seatColumnChar = (char) ('A' + (colNumber - 1));
        return new int[] { seatRow, (int) seatColumnChar };
    }

    private String generateNextInvoiceId() {
        List<String> allIds = invoiceRepository.findAllIds();
        Pattern pattern = Pattern.compile("INV-(\\d+)");
        int max = 0;
        for (String id : allIds) {
            Matcher m = pattern.matcher(id);
            if (m.matches()) {
                max = Math.max(max, Integer.parseInt(m.group(1)));
            }
        }
        return String.format("INV-%04d", max + 1);
    }
}