package com.movie_be.movie.service.impl;

import com.movie_be.movie.dto.InvoiceDTO;
import com.movie_be.movie.entity.account.Account;
import com.movie_be.movie.entity.invoice.Invoice;
import com.movie_be.movie.entity.schedule.Schedule;
import com.movie_be.movie.entity.schedule.ScheduleSeat;
import com.movie_be.movie.repository.AccountRepository;
import com.movie_be.movie.repository.InvoiceRepository;
import com.movie_be.movie.repository.ScheduleRepository;
import com.movie_be.movie.repository.ScheduleSeatRepository;
import com.movie_be.movie.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final AccountRepository accountRepository;
    private final ScheduleRepository scheduleRepository;
    private final ScheduleSeatRepository scheduleSeatRepository;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter CHECKIN_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");





    @Override
    public InvoiceDTO create(InvoiceDTO dto) {
        if (dto == null) throw new IllegalArgumentException("InvoiceDTO is null");

        if (dto.getMovieName() == null || dto.getMovieName().isBlank()) {
            throw new IllegalArgumentException("movieName is required");
        }
        if (dto.getScheduleShow() == null || dto.getScheduleShow().isBlank()) {
            throw new IllegalArgumentException("scheduleShow is required (yyyy-MM-dd)");
        }
        if (dto.getScheduleShowTime() == null || dto.getScheduleShowTime().isBlank()) {
            throw new IllegalArgumentException("scheduleShowTime is required");
        }
        if (dto.getSeat() == null || dto.getSeat().isBlank()) {
            throw new IllegalArgumentException("seat is required");
        }
        if (dto.getTotalMoney() == null) {
            throw new IllegalArgumentException("totalMoney is required");
        }

        Invoice invoice = new Invoice();
        invoice.setInvoiceId(generateNextId());

        // bookingDate: dd-MM-yyyy (FE gửi)

        if (dto.getBookingDate() != null && !dto.getBookingDate().isBlank()) {
            invoice.setBookingDate(parseBookingDate(dto.getBookingDate()));
        } else {
            invoice.setBookingDate(LocalDateTime.now());
        }


        invoice.setMovieName(dto.getMovieName());
        invoice.setScheduleShow(parseDate(dto.getScheduleShow()));
        invoice.setScheduleShowTime(dto.getScheduleShowTime());
        invoice.setSeat(dto.getSeat());

        invoice.setAddScore(dto.getAddScore() != null ? dto.getAddScore() : 0);
        invoice.setUseScore(dto.getUseScore() != null ? dto.getUseScore() : 0);
        invoice.setTotalMoney(dto.getTotalMoney());
        invoice.setStatus(dto.getStatus() != null ? dto.getStatus() : (short) 1);

        if (dto.getAccountId() != null && !dto.getAccountId().isBlank()) {
            Account account = accountRepository.findById(dto.getAccountId())
                    .orElseThrow(() -> new RuntimeException("Account not found: " + dto.getAccountId()));
            invoice.setAccount(account);
        }

        return toDto(invoiceRepository.save(invoice));
    }

    @Override
    public InvoiceDTO updatePartial(@NonNull String invoiceId, InvoiceDTO dto) {
        if (dto == null) throw new IllegalArgumentException("InvoiceDTO is null");

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found: " + invoiceId));

        if (dto.getMovieName() != null) {
            invoice.setMovieName(dto.getMovieName());
        }

        if (dto.getScheduleShow() != null) {
            invoice.setScheduleShow(parseDate(dto.getScheduleShow()));
        }

        if (dto.getScheduleShowTime() != null) {
            invoice.setScheduleShowTime(dto.getScheduleShowTime());
        }

        if (dto.getSeat() != null) {
            invoice.setSeat(dto.getSeat());
        }

        if (dto.getAddScore() != null) {
            invoice.setAddScore(dto.getAddScore());
        }

        if (dto.getUseScore() != null) {
            invoice.setUseScore(dto.getUseScore());
        }

        if (dto.getTotalMoney() != null) {
            invoice.setTotalMoney(dto.getTotalMoney());
        }

        if (dto.getStatus() != null) {
            invoice.setStatus(dto.getStatus());
        }

        if (dto.getAccountId() != null) {
            if (dto.getAccountId().isBlank()) {
                invoice.setAccount(null);
            } else {
                Account account = accountRepository.findById(dto.getAccountId())
                        .orElseThrow(() -> new RuntimeException("Account not found: " + dto.getAccountId()));
                invoice.setAccount(account);
            }
        }

        if (dto.getBookingDate() != null) {
            if (!dto.getBookingDate().isBlank()) {
                invoice.setBookingDate(parseBookingDate(dto.getBookingDate()));
            } else {
                invoice.setBookingDate(LocalDateTime.now());
            }
        }



        return toDto(invoiceRepository.save(invoice));
    }

    @Override
    public InvoiceDTO getById(@NonNull String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found: " + invoiceId));
        return toDto(invoice);
    }

    @Override
    public java.util.List<InvoiceDTO> getAll() {
        return invoiceRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public void delete(@NonNull String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found: " + invoiceId));

        releaseSeatsForInvoice(invoice);

        invoiceRepository.deleteById(invoiceId);
    }

    private void releaseSeatsForInvoice(Invoice invoice) {
        if (invoice.getSeat() == null || invoice.getSeat().isBlank()) return;
        if (invoice.getScheduleShow() == null || invoice.getScheduleShowTime() == null) return;

        List<String> seatCodes = Arrays.stream(invoice.getSeat().split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        List<Schedule> schedules = scheduleRepository.findAllByShowDateAndScheduleTime(
                invoice.getScheduleShow(), invoice.getScheduleShowTime().trim());

        for (Schedule schedule : schedules) {
            Integer sid = schedule.getScheduleId();
            for (String code : seatCodes) {
                try {
                    int[] parts = parseSeatCode(code);
                    int seatRow = parts[0];
                    String seatColumn = String.valueOf((char) parts[1]);

                    List<ScheduleSeat> seats = scheduleSeatRepository
                            .findAllByShowtimeIdAndSeatRowAndSeatColumnIn(sid, seatRow, List.of(seatColumn));
                    if (seats.isEmpty()) {
                        seats = scheduleSeatRepository
                                .findAllByScheduleIdAndSeatRowAndSeatColumnIn(sid, seatRow, List.of(seatColumn));
                    }
                    for (ScheduleSeat ss : seats) {
                        ss.setSeatStatus((short) 0);
                    }
                    if (!seats.isEmpty()) {
                        scheduleSeatRepository.saveAll(seats);
                    }
                } catch (Exception ignored) {
                    // skip invalid seat codes
                }
            }
        }
    }

    private int[] parseSeatCode(String seatCode) {
        char rowChar = seatCode.charAt(0);
        if (rowChar < 'A' || rowChar > 'H') throw new IllegalArgumentException("Invalid seat row: " + rowChar);
        int seatRow = (rowChar - 'A') + 1;
        int colNumber = Integer.parseInt(seatCode.substring(1));
        if (colNumber < 1 || colNumber > 12) throw new IllegalArgumentException("Invalid seat column: " + colNumber);
        char seatColumnChar = (char) ('A' + (colNumber - 1));
        return new int[]{seatRow, (int) seatColumnChar};
    }

    private LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value, DATE_FORMAT);
        } catch (Exception e) {
            throw new IllegalArgumentException("Date must be in format yyyy-MM-dd, got: " + value);


        }
    }

    private LocalDateTime parseBookingDate(String value) {
        try {
            LocalDate localDate = LocalDate.parse(value, DATE_FORMAT);
            return localDate.atStartOfDay();
        } catch (Exception e) {
            throw new IllegalArgumentException("bookingDate must be in format yyyy-MM-dd, got: " + value);
        }
    }

    // Tự sinh mã hóa đơn dạng INV-XXXX, tăng dần từ max hiện có
    private String generateNextId() {
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


    private InvoiceDTO toDto(Invoice invoice) {
        String accountId = invoice.getAccount() != null ? invoice.getAccount().getAccountId() : null;

        String bookingDateFormatted = null;
        if (invoice.getBookingDate() != null) {
            bookingDateFormatted = invoice.getBookingDate().toLocalDate().format(DATE_FORMAT);
        }

        String scheduleShowFormatted = null;
        if (invoice.getScheduleShow() != null) {
            scheduleShowFormatted = invoice.getScheduleShow().format(DATE_FORMAT);
        }

        String checkinTimeFormatted = invoice.getCheckinTime() != null
                ? invoice.getCheckinTime().format(CHECKIN_TIME_FORMAT)
                : null;

        return new InvoiceDTO(
                invoice.getInvoiceId(),
                bookingDateFormatted,
                invoice.getMovieName(),
                scheduleShowFormatted,
                invoice.getScheduleShowTime(),
                invoice.getSeat(),
                invoice.getAddScore(),
                invoice.getUseScore(),
                invoice.getTotalMoney(),
                invoice.getStatus(),
                accountId,
                invoice.getCheckinStatus(),
                checkinTimeFormatted,
                invoice.getTicketMode()
        );
    }

}

