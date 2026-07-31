package com.movie_be.movie.controller;

import com.movie_be.movie.dto.PayOSCheckoutRequest;
import com.movie_be.movie.dto.PayOSWebhookRequest;
import com.movie_be.movie.service.PayOSPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments/payos")
@RequiredArgsConstructor
public class PaymentController {

    private final PayOSPaymentService payOSPaymentService;

    @PostMapping("/create")
    public ResponseEntity<?> create(@Valid @RequestBody PayOSCheckoutRequest request) {
        try {
            return ResponseEntity.ok(payOSPaymentService.createCheckoutForBooking(request));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Public — no auth. PayOS calls this server-to-server. Must ACK 200 even for the dashboard's
     *  initial registration test ping, whose orderCode won't match any real invoice. */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, String>> webhook(@RequestBody PayOSWebhookRequest payload) {
        if (!payOSPaymentService.verifyWebhookSignature(payload)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid signature"));
        }
        payOSPaymentService.handleWebhook(payload);
        return ResponseEntity.ok(Map.of("message", "ok"));
    }

    @GetMapping("/status/{orderCode}")
    public ResponseEntity<?> status(@PathVariable long orderCode) {
        try {
            return ResponseEntity.ok(payOSPaymentService.getStatus(orderCode));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/cancel/{orderCode}")
    public ResponseEntity<Void> cancel(@PathVariable long orderCode) {
        payOSPaymentService.cancelCheckout(orderCode);
        return ResponseEntity.noContent().build();
    }
}
