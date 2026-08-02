package com.movie_be.movie.service.impl;

import com.movie_be.movie.dto.BookingRequestDTO;
import com.movie_be.movie.dto.InvoiceDTO;
import com.movie_be.movie.dto.PayOSCheckoutRequest;
import com.movie_be.movie.dto.PayOSCheckoutResponse;
import com.movie_be.movie.dto.PayOSWebhookRequest;
import com.movie_be.movie.dto.PaymentStatusResponse;
import com.movie_be.movie.entity.invoice.Invoice;
import com.movie_be.movie.payos.PayOSClient;
import com.movie_be.movie.payos.PayOSSignatureUtil;
import com.movie_be.movie.payos.dto.PayOSCreatePaymentRequest;
import com.movie_be.movie.payos.dto.PayOSCreatePaymentResponse;
import com.movie_be.movie.payos.dto.PayOSPaymentLinkInfoResponse;
import com.movie_be.movie.repository.InvoiceRepository;
import com.movie_be.movie.service.BookingService;
import com.movie_be.movie.service.PayOSPaymentService;
import com.movie_be.movie.service.SeatReservationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PayOSPaymentServiceImpl implements PayOSPaymentService {

    private static final Logger log = LoggerFactory.getLogger(PayOSPaymentServiceImpl.class);

    private final PayOSClient payOSClient;
    private final InvoiceRepository invoiceRepository;
    private final BookingService bookingService;
    private final SeatReservationService seatReservationService;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String defaultFrontendBaseUrl;

    @Override
    @Transactional
    public PayOSCheckoutResponse createCheckoutForBooking(PayOSCheckoutRequest req) {
        BookingRequestDTO bookingReq = new BookingRequestDTO();
        bookingReq.setScheduleShow(req.getScheduleShow());
        bookingReq.setScheduleShowTime(req.getScheduleShowTime());
        bookingReq.setMovieName(req.getMovieName());
        bookingReq.setMovieId(req.getMovieId());
        bookingReq.setSeat(req.getSeat());
        bookingReq.setTicketMode(req.getTicketMode());
        bookingReq.setQuantity(req.getQuantity());
        bookingReq.setAddScore(req.getAddScore());
        bookingReq.setUseScore(req.getUseScore());
        bookingReq.setTotalMoney(req.getTotalMoney());
        bookingReq.setAccountId(req.getAccountId());
        bookingReq.setShowtimeId(req.getShowtimeId());
        bookingReq.setCustomerEmail(req.getCustomerEmail());
        bookingReq.setPaymentMethod("PAYOS");

        // Reserves seats + saves Invoice with paymentStatus=PENDING, status=null, no email sent yet.
        InvoiceDTO created = bookingService.createBooking(bookingReq);

        long orderCode = Instant.now().toEpochMilli();
        long amount = req.getTotalMoney().setScale(0, RoundingMode.HALF_UP).longValueExact();
        String description = truncate("CineNoir " + created.getId(), 25);

        PayOSCreatePaymentRequest payReq = new PayOSCreatePaymentRequest();
        payReq.setOrderCode(orderCode);
        payReq.setAmount(amount);
        payReq.setDescription(description);
        payReq.setReturnUrl(appendOrderCode(req.getReturnUrl(), orderCode));
        payReq.setCancelUrl(appendOrderCode(req.getCancelUrl(), orderCode));
        payReq.setBuyerEmail(req.getCustomerEmail());
        payReq.setExpiredAt(Instant.now().plus(15, ChronoUnit.MINUTES).getEpochSecond());
        payReq.setItems(List.of(new PayOSCreatePaymentRequest.Item(req.getMovieName(), 1, amount)));

        Invoice invoice = invoiceRepository.findById(created.getId())
                .orElseThrow(() -> new IllegalStateException("Invoice vanished right after creation: " + created.getId()));

        PayOSCreatePaymentResponse.Data payData;
        try {
            payData = payOSClient.createPaymentLink(payReq);
        } catch (Exception e) {
            log.error("PayOS createPaymentLink failed for invoice {}", created.getId(), e);
            markCancelledOrFailed(invoice, "FAILED");
            throw new IllegalStateException("Không thể khởi tạo thanh toán PayOS. Vui lòng thử lại.", e);
        }

        invoice.setPayosOrderCode(orderCode);
        invoiceRepository.save(invoice);

        return new PayOSCheckoutResponse(created.getId(), orderCode, payData.getCheckoutUrl(), payData.getQrCode());
    }

    @Override
    public boolean verifyWebhookSignature(PayOSWebhookRequest payload) {
        if (payload == null || payload.getData() == null || payload.getSignature() == null) return false;
        String expected = PayOSSignatureUtil.signDataObject(payOSClient.getChecksumKey(), payload.getData());
        return expected.equalsIgnoreCase(payload.getSignature());
    }

    @Override
    @Transactional
    public void handleWebhook(PayOSWebhookRequest payload) {
        Object orderCodeRaw = payload.getData() != null ? payload.getData().get("orderCode") : null;
        if (orderCodeRaw == null) {
            log.info("PayOS webhook without orderCode (likely the dashboard registration ping): {}", payload.getDesc());
            return; // still ACKed 200 by the controller
        }
        long orderCode = ((Number) orderCodeRaw).longValue();
        boolean paid = payload.isSuccess() && "00".equals(payload.getCode());
        if (paid) {
            markPaid(orderCode);
        } else {
            invoiceRepository.findByPayosOrderCode(orderCode).ifPresent(inv -> markCancelledOrFailed(inv, "FAILED"));
        }
    }

    @Override
    @Transactional
    public PaymentStatusResponse getStatus(long orderCode) {
        Invoice invoice = invoiceRepository.findByPayosOrderCode(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Unknown PayOS orderCode: " + orderCode));

        if ("PENDING".equals(invoice.getPaymentStatus())) {
            // Webhook may not have landed yet — ask PayOS directly as a fallback (never trust the browser alone).
            try {
                PayOSPaymentLinkInfoResponse.Data info = payOSClient.getPaymentLinkInfo(orderCode);
                if ("PAID".equalsIgnoreCase(info.getStatus())) {
                    markPaid(orderCode);
                    invoice = invoiceRepository.findByPayosOrderCode(orderCode).orElse(invoice);
                } else if ("CANCELLED".equalsIgnoreCase(info.getStatus()) || "EXPIRED".equalsIgnoreCase(info.getStatus())) {
                    markCancelledOrFailed(invoice, "CANCELLED");
                    invoice = invoiceRepository.findByPayosOrderCode(orderCode).orElse(invoice);
                }
            } catch (Exception e) {
                log.warn("PayOS getPaymentLinkInfo fallback check failed for orderCode {}: {}", orderCode, e.getMessage());
            }
        }

        return new PaymentStatusResponse(invoice.getInvoiceId(), orderCode, invoice.getPaymentStatus(),
                invoice.getStatus(), invoice.getTotalMoney());
    }

    @Override
    @Transactional
    public void cancelCheckout(long orderCode) {
        invoiceRepository.findByPayosOrderCode(orderCode).ifPresent(inv -> markCancelledOrFailed(inv, "CANCELLED"));
    }

    /** Runs every 5 minutes; safety net for pure abandonment (closed tab — no cancelUrl hit, no webhook). */
    @Override
    @Scheduled(fixedDelay = 5 * 60 * 1000)
    @Transactional
    public void sweepExpiredPendingPayments() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(20);
        List<Invoice> stale = invoiceRepository.findByPaymentMethodAndPaymentStatusAndBookingDateBefore(
                "PAYOS", "PENDING", cutoff);
        for (Invoice invoice : stale) {
            log.info("Sweeping stale PAYOS invoice {} (created {})", invoice.getInvoiceId(), invoice.getBookingDate());
            markCancelledOrFailed(invoice, "CANCELLED");
        }
    }

    // =========================
    // Internal helpers
    // =========================

    private void markPaid(long orderCode) {
        Invoice invoice = invoiceRepository.findByPayosOrderCode(orderCode).orElse(null);
        if (invoice == null) {
            log.warn("PayOS webhook/poll for unknown orderCode {}", orderCode);
            return;
        }
        if ("PAID".equals(invoice.getPaymentStatus())) {
            return; // idempotent — PayOS may retry webhook delivery
        }
        invoice.setPaymentStatus("PAID");
        invoice.setPaidAt(LocalDateTime.now());
        invoice.setStatus((short) 2); // matches what the old fake flow already set on "payment"
        invoiceRepository.save(invoice);
        try {
            bookingService.sendPaymentConfirmedEmail(invoice.getInvoiceId());
        } catch (Exception e) {
            log.error("Failed to send payment-confirmed email for invoice {}", invoice.getInvoiceId(), e);
        }
    }

    private void markCancelledOrFailed(Invoice invoice, String newStatus) {
        if ("PAID".equals(invoice.getPaymentStatus())) return;      // already paid — ignore late cancel signal
        if (newStatus.equals(invoice.getPaymentStatus())) return;   // idempotent
        invoice.setPaymentStatus(newStatus);
        invoiceRepository.save(invoice);
        releaseSeatsIfNeeded(invoice);
    }

    private void releaseSeatsIfNeeded(Invoice invoice) {
        if (!"THEATER".equals(invoice.getTicketMode())) return; // ONLINE has no real seats
        if (invoice.getShowtimeId() == null || invoice.getSeat() == null || invoice.getSeat().isBlank()) return;
        List<String> seatCodes = Arrays.stream(invoice.getSeat().split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
        seatReservationService.releaseBookedSeats(invoice.getShowtimeId(), seatCodes);
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    private String appendOrderCode(String url, long orderCode) {
        String base = (url == null || url.isBlank()) ? defaultFrontendBaseUrl : url;
        return base + (base.contains("?") ? "&" : "?") + "orderCode=" + orderCode;
    }
}
