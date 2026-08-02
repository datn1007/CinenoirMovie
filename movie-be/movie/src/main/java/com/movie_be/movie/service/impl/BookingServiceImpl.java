package com.movie_be.movie.service.impl;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.movie_be.movie.dto.BookingRequestDTO;
import com.movie_be.movie.dto.BookingSearchResponse;
import com.movie_be.movie.dto.InvoiceDTO;
import com.movie_be.movie.entity.account.Account;
import com.movie_be.movie.entity.cinemaroom.CinemaRoom;
import com.movie_be.movie.entity.invoice.Invoice;
import com.movie_be.movie.entity.member.Member;
import com.movie_be.movie.repository.AccountRepository;
import com.movie_be.movie.repository.CinemaRoomRepository;
import com.movie_be.movie.repository.InvoiceRepository;
import com.movie_be.movie.repository.MemberRepository;
import com.movie_be.movie.repository.ScheduleRepository;
import com.movie_be.movie.service.BookingService;
import com.movie_be.movie.service.EmailService;
import com.movie_be.movie.service.SeatReservationService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingServiceImpl.class);

    private final InvoiceRepository invoiceRepository;
    private final AccountRepository accountRepository;
    private final MemberRepository memberRepository;
    private final SeatReservationService seatReservationService;
    private final ScheduleRepository scheduleRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final EmailService emailService;

    @Value("${app.backend-base-url:http://localhost:8080}")
    private String backendBaseUrl;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DISPLAY_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter CHECKIN_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final NumberFormat VND_FORMAT = NumberFormat.getInstance(new Locale("vi", "VN"));

    @Override
    public @NonNull InvoiceDTO createBooking(@NonNull BookingRequestDTO request) {

        // =========================
        // VALIDATION
        // =========================
        if (request.getScheduleShow() == null || request.getScheduleShow().isBlank()) {
            throw new IllegalArgumentException("scheduleShow is required");
        }
        if (request.getMovieName() == null || request.getMovieName().isBlank()) {
            throw new IllegalArgumentException("movieName is required");
        }
        boolean online = request.isOnline();
        if (!online && (request.getSeatList() == null || request.getSeatList().isEmpty())) {
            throw new IllegalArgumentException("seats is required");
        }
        if (online && (request.getQuantity() == null || request.getQuantity() < 1)) {
            throw new IllegalArgumentException("quantity is required for online tickets");
        }
        if (request.getTotalMoney() == null) {
            throw new IllegalArgumentException("totalMoney is required");
        }

        String seatCsv;
        if (online) {
            // No seat is reserved for an online-viewing ticket — nothing to double-book.
            seatCsv = "Online x" + request.getQuantity();
        } else {
            List<String> seats = request.getSeatList();
            // =========================
            // RESERVE SEATS
            // =========================
            seatReservationService.reserveSeats(request, seats);
            seatCsv = String.join(",", seats);
        }

        // =========================
        // SCHEDULE LOOKUP
        // =========================
        Integer scheduleId;
        try {
            scheduleId = Integer.parseInt(request.getScheduleShow().replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid schedule ID: " + request.getScheduleShow());
        }

        var schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + request.getScheduleShow()));

        // =========================
        // BUILD INVOICE
        // =========================
        String invoiceId = request.getInvoiceId() != null && !request.getInvoiceId().isBlank()
                ? request.getInvoiceId()
                : "BK" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();

        Invoice invoice = new Invoice();
        invoice.setInvoiceId(invoiceId);
        invoice.setBookingDate(LocalDateTime.now());
        invoice.setMovieName(request.getMovieName());
        invoice.setMovieId(request.getMovieId());

        invoice.setScheduleShow(schedule.getShowDate() != null ? schedule.getShowDate() : LocalDate.now());
        invoice.setScheduleShowTime(schedule.getScheduleTime());

        invoice.setSeat(seatCsv);
        invoice.setAddScore(request.getAddScore() != null ? request.getAddScore() : 0);
        invoice.setUseScore(request.getUseScore() != null ? request.getUseScore() : 0);
        invoice.setTotalMoney(request.getTotalMoney());

        boolean isPayOS = "PAYOS".equalsIgnoreCase(request.getPaymentMethod());
        // No status bucket in the legacy enum means "awaiting payment" — leave it null until the
        // PayOS webhook confirms payment instead of falsely claiming 1 (confirmed) up front.
        invoice.setStatus(request.getStatus() != null ? request.getStatus() : (isPayOS ? null : (short) 1));
        invoice.setCheckinStatus((short) 0);
        invoice.setTicketMode(online ? "ONLINE" : "THEATER");
        invoice.setShowtimeId(request.getShowtimeId());
        invoice.setPaymentMethod(isPayOS ? "PAYOS" : "CASH");
        invoice.setPaymentStatus(isPayOS ? "PENDING" : "PAID");

        // =========================
        // ACCOUNT LOOKUP
        // =========================
        if (request.getAccountId() != null && !request.getAccountId().isBlank()) {
            Account account = accountRepository.findById(request.getAccountId())
                    .orElseThrow(() -> new IllegalArgumentException("Account not found: " + request.getAccountId()));
            invoice.setAccount(account);
        }

        Invoice saved = invoiceRepository.save(invoice);

        // For PayOS bookings, defer the confirmation email until payment is actually confirmed
        // by the webhook (see sendPaymentConfirmedEmail) — don't promise a ticket before it's paid.
        if (!isPayOS) {
            String roomName = cinemaRoomRepository.findById(schedule.getCinemaRoomId())
                    .map(CinemaRoom::getCinemaRoomName)
                    .orElse(null);
            sendBookingConfirmationEmail(saved, request, roomName);
        }

        return toDto(saved);
    }

    @Override
    public void sendPaymentConfirmedEmail(String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId).orElse(null);
        if (invoice == null) return;

        BookingRequestDTO stub = new BookingRequestDTO();
        stub.setSeat(invoice.getSeat());
        stub.setTicketMode(invoice.getTicketMode());
        stub.setCustomerEmail(invoice.getAccount() != null ? invoice.getAccount().getEmail() : null);
        if ("ONLINE".equals(invoice.getTicketMode())) {
            try {
                stub.setQuantity(Integer.parseInt(invoice.getSeat().replaceAll("[^0-9]", "")));
            } catch (Exception ignored) {
                stub.setQuantity(1);
            }
        }
        // ticketAmount/serviceFee/comboAmount/voucherDiscount intentionally left null —
        // buildTicketEmailHtml already falls back to invoice.getTotalMoney() when they're absent.

        String roomName = null;
        try {
            if (invoice.getShowtimeId() != null) {
                var schedule = scheduleRepository.findById(invoice.getShowtimeId()).orElse(null);
                if (schedule != null) {
                    roomName = cinemaRoomRepository.findById(schedule.getCinemaRoomId())
                            .map(CinemaRoom::getCinemaRoomName)
                            .orElse(null);
                }
            }
        } catch (Exception ignored) {
            // best-effort — email still sends without a room name
        }

        sendBookingConfirmationEmail(invoice, stub, roomName);
    }

    /**
     * Best-effort ticket confirmation email: prefers the email typed on the
     * booking form (request.customerEmail) so guests can redirect it, falls
     * back to the account's registered email. Never fails the booking itself
     * — the invoice is already committed by the time this runs. The price
     * breakdown (ticket/service fee/combo/voucher) comes from the FE bill —
     * the invoice itself only stores the final totalMoney — so it's display
     * only, not re-derived server-side.
     */
    private void sendBookingConfirmationEmail(Invoice invoice, BookingRequestDTO request, String roomName) {
        String toEmail = request.getCustomerEmail() != null && !request.getCustomerEmail().isBlank()
                ? request.getCustomerEmail()
                : (invoice.getAccount() != null ? invoice.getAccount().getEmail() : null);

        if (toEmail == null || toEmail.isBlank()) {
            return;
        }

        String subject = "Vé xem phim CineNoir - " + invoice.getInvoiceId();
        boolean online = "ONLINE".equals(invoice.getTicketMode());

        // Gmail (and most clients) strip base64-embedded <img> data from HTML email as an
        // anti-abuse measure, so the QR code is referenced as a normal https:// image URL served
        // by TicketQrController instead of being embedded inline.
        String qrImageUrl = online ? null : backendBaseUrl + "/api/tickets/" + invoice.getInvoiceId() + "/qr.png";

        String html = buildTicketEmailHtml(invoice, request, roomName, online, qrImageUrl);

        try {
            emailService.sendHtmlEmail(toEmail, subject, html);
            log.info("Booking confirmation email sent to {} for invoice {}", toEmail, invoice.getInvoiceId());
        } catch (Exception e) {
            log.error("Failed to send booking confirmation email to {} for invoice {}", toEmail, invoice.getInvoiceId(), e);
        }
    }

    private String buildTicketEmailHtml(Invoice invoice, BookingRequestDTO request, String roomName, boolean online, String qrImageUrl) {
        int seatCount = online ? request.getQuantity() : request.getSeatList().size();
        String showDate = invoice.getScheduleShow() != null ? invoice.getScheduleShow().format(DISPLAY_DATE_FORMAT) : "";

        BigDecimal ticketAmount = request.getTicketAmount();
        String giaValue;
        if (ticketAmount != null && seatCount > 0) {
            BigDecimal unitPrice = ticketAmount.divide(BigDecimal.valueOf(seatCount), 0, java.math.RoundingMode.HALF_UP);
            giaValue = seatCount + " x " + money(unitPrice) + "đ";
        } else {
            giaValue = money(invoice.getTotalMoney()) + "đ";
        }

        StringBuilder extraRows = new StringBuilder();
        if (request.getServiceFee() != null && request.getServiceFee().signum() > 0) {
            extraRows.append(infoRow("Phí dịch vụ", money(request.getServiceFee()) + "đ"));
        }
        if (request.getComboAmount() != null && request.getComboAmount().signum() > 0) {
            extraRows.append(infoRow("Combo bắp nước", money(request.getComboAmount()) + "đ"));
        }
        String khuyenMai = request.getVoucherDiscount() != null && request.getVoucherDiscount().signum() > 0
                ? "-" + money(request.getVoucherDiscount()) + "đ"
                : "0đ";

        return "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;\">"
                + "<div style=\"padding:24px;\">"
                + "<h2 style=\"margin:0 0 16px;font-size:18px;color:#1a1a1a;\">THÔNG TIN VÉ</h2>"
                + "<table style=\"width:100%;border-collapse:collapse;font-size:14px;color:#333;\">"
                + infoRow("Mã vé", invoice.getInvoiceId())
                + infoRow("Tên phim", invoice.getMovieName())
                + infoRow("Rạp", "CineNoir Cinemas - Số 408 Đại Lộ Nghệ Thuật")
                + infoRow("Phòng chiếu", roomName != null ? roomName : "—")
                + infoRow("Suất chiếu", showDate + " " + invoice.getScheduleShowTime())
                + (online ? infoRow("Số lượng vé", String.valueOf(seatCount)) : infoRow("Ghế", invoice.getSeat() + " (Vé: " + seatCount + ")"))
                + infoRow("Giá", giaValue)
                + "</table>"
                + "<hr style=\"border:none;border-top:1px solid #e0e0e0;margin:16px 0;\">"
                + "<table style=\"width:100%;border-collapse:collapse;font-size:14px;color:#333;\">"
                + extraRows
                + infoRow("Khuyến mãi", khuyenMai)
                + "</table>"
                + "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:12px;border-top:2px solid #1a1a1a;\">"
                + "<span style=\"font-weight:bold;color:#1a1a1a;\">Tổng Cộng:</span>"
                + "<span style=\"font-weight:bold;font-size:18px;color:#1a1a1a;\">" + money(invoice.getTotalMoney()) + "đ</span>"
                + "</div>"
                + (online
                    ? "<div style=\"margin-top:16px;padding:10px;background:#e7f5ea;border:1px solid #a8d9b3;border-radius:4px;text-align:center;font-weight:600;color:#276b39;\">"
                      + "Vé xem online của bạn đã sẵn sàng — đăng nhập vào tài khoản CineNoir và bấm \"Xem Phim\" để xem ngay."
                      + "</div>"
                    : "<div style=\"margin-top:16px;padding:10px;background:#fff8e1;border:1px solid #f0d98c;border-radius:4px;text-align:center;font-weight:600;color:#8a6d00;\">"
                      + "Trạng thái vé: Chờ xác thực — vui lòng xuất trình mã QR bên dưới cho nhân viên soát vé"
                      + "</div>"
                      + (qrImageUrl != null
                          ? "<div style=\"text-align:center;margin-top:16px;\">"
                            + "<img src=\"" + qrImageUrl + "\" alt=\"QR Code\" width=\"180\" height=\"180\" style=\"display:inline-block;\">"
                            + "<div style=\"margin-top:6px;font-size:11px;color:#777;\">Mã vé: " + invoice.getInvoiceId() + "</div>"
                            + "</div>"
                          : ""))
                + "</div>"
                + "<div style=\"background:#7a0c12;color:#f2d9d9;padding:20px 24px;font-size:12px;line-height:1.6;\">"
                + "<div style=\"color:#ffffff;font-weight:bold;font-size:15px;margin-bottom:6px;\">CineNoir Cinemas</div>"
                + "<div>Số 408 Đại Lộ Nghệ Thuật</div>"
                + "<div>Hotline: 1900 1234 &nbsp;·&nbsp; 10:00 – 24:00 hàng ngày</div>"
                + "</div>"
                + "</div>";
    }

    private static String infoRow(String label, String value) {
        return "<tr>"
                + "<td style=\"padding:4px 0;color:#777;\">" + label + ":</td>"
                + "<td style=\"padding:4px 0;text-align:right;font-weight:600;\">" + value + "</td>"
                + "</tr>";
    }

    private static String money(BigDecimal amount) {
        return amount != null ? VND_FORMAT.format(amount) : "0";
    }

    @Override
    public List<BookingSearchResponse> searchBookings(String bookingId, String accountId,
                                                       String phoneNumber, String identityCard) {

        List<Invoice> invoices = new ArrayList<>();

        if (bookingId != null && !bookingId.isBlank()) {
            invoices = invoiceRepository.findByInvoiceIdContainingIgnoreCase(bookingId.trim());
        } else if (accountId != null && !accountId.isBlank()) {
            invoices = invoiceRepository.findByAccount_AccountId(accountId.trim());
        } else if (phoneNumber != null && !phoneNumber.isBlank()) {
            invoices = invoiceRepository.findByAccountPhoneContaining(phoneNumber.trim());
        } else if (identityCard != null && !identityCard.isBlank()) {
            List<Account> accounts = accountRepository.findByIdentityCardContaining(identityCard.trim());
            for (Account acc : accounts) {
                invoices.addAll(invoiceRepository.findByAccount_AccountId(acc.getAccountId()));
            }
        } else {
            invoices = invoiceRepository.findAll();
        }

        return invoices.stream()
                .map(this::toSearchResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BookingSearchResponse confirmBooking(String bookingId, Integer useScore) {

        Invoice invoice = invoiceRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        Short status = invoice.getStatus();

        if (status == null) {
            throw new IllegalStateException("Booking has no status");
        }
        if (status == 3) {
            throw new IllegalStateException("Booking already confirmed");
        }
        if (status != 1 && status != 2) {
            throw new IllegalStateException("Invalid booking status: " + status);
        }

        if (useScore != null && useScore > 0 && invoice.getAccount() != null) {

            Member member = memberRepository.findByAccount_AccountId(
                    invoice.getAccount().getAccountId()
            ).orElseThrow(() -> new IllegalArgumentException("Not a member"));

            int score = member.getScore() != null ? member.getScore() : 0;

            if (score < useScore) {
                throw new IllegalArgumentException("Not enough score");
            }

            member.setScore(score - useScore);
            memberRepository.save(member);
            invoice.setUseScore(useScore);
        }

        invoice.setStatus((short) 3);
        invoiceRepository.save(invoice);

        return toSearchResponse(invoice);
    }

    @Override
    @Transactional
    public BookingSearchResponse checkinTicket(@NonNull String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + invoiceId));

        if ("ONLINE".equals(invoice.getTicketMode())) {
            throw new IllegalStateException("Vé xem online không cần check-in tại rạp");
        }
        if (invoice.getCheckinStatus() != null && invoice.getCheckinStatus() == 1) {
            String at = invoice.getCheckinTime() != null ? invoice.getCheckinTime().format(CHECKIN_TIME_FORMAT) : "";
            throw new IllegalStateException("Vé đã được check-in lúc " + at);
        }

        invoice.setCheckinStatus((short) 1);
        invoice.setCheckinTime(LocalDateTime.now());
        invoiceRepository.save(invoice);

        return toSearchResponse(invoice);
    }

    // =========================
    // DTO MAPPING
    // =========================
    private InvoiceDTO toDto(Invoice invoice) {

        String accountId = invoice.getAccount() != null ? invoice.getAccount().getAccountId() : null;

        String bookingDate = invoice.getBookingDate() != null
                ? invoice.getBookingDate().toLocalDate().format(DATE_FORMAT)
                : null;

        String checkinTimeFormatted = invoice.getCheckinTime() != null
                ? invoice.getCheckinTime().format(CHECKIN_TIME_FORMAT)
                : null;

        return new InvoiceDTO(
                invoice.getInvoiceId(),
                bookingDate,
                invoice.getMovieName(),
                invoice.getScheduleShow() != null ? invoice.getScheduleShow().toString() : null,
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

    private BookingSearchResponse toSearchResponse(Invoice invoice) {

        String bookingDate = invoice.getBookingDate() != null
                ? invoice.getBookingDate().toLocalDate().format(DATE_FORMAT)
                : null;

        String checkinTimeFormatted = invoice.getCheckinTime() != null
                ? invoice.getCheckinTime().format(CHECKIN_TIME_FORMAT)
                : null;

        // ISO-8601 with an explicit "Z" (the JVM runs in UTC — see application.properties/deploy
        // notes — so LocalDateTime.now() already holds a UTC instant) so the FE can safely do
        // real date-math (24h online-viewing expiry) instead of just displaying it.
        String paidAtFormatted = invoice.getPaidAt() != null
                ? invoice.getPaidAt().toString() + "Z"
                : null;

        BookingSearchResponse.BookingSearchResponseBuilder builder =
                BookingSearchResponse.builder()
                        .invoiceId(invoice.getInvoiceId())
                        .bookingDate(bookingDate)
                        .movieName(invoice.getMovieName())
                        .showDate(bookingDate)
                        .showTime(invoice.getScheduleShowTime())
                        .seats(invoice.getSeat())
                        .usedScore(invoice.getUseScore())
                        .totalMoney(invoice.getTotalMoney())
                        .status(invoice.getStatus())
                        .checkinStatus(invoice.getCheckinStatus())
                        .checkinTime(checkinTimeFormatted)
                        .ticketMode(invoice.getTicketMode())
                        .paymentMethod(invoice.getPaymentMethod())
                        .paymentStatus(invoice.getPaymentStatus())
                        .movieId(invoice.getMovieId())
                        .paidAt(paidAtFormatted);

        if (invoice.getAccount() != null) {
            builder.accountId(invoice.getAccount().getAccountId())
                    .fullName(invoice.getAccount().getFullName())
                    .phoneNumber(invoice.getAccount().getPhone())
                    .identityCard(invoice.getAccount().getIdentityCard());
        }

        return builder.build();
    }
}
