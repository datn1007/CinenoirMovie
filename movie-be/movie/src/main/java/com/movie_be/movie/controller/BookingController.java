package com.movie_be.movie.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import jakarta.validation.Valid;

import com.movie_be.movie.dto.BookingRequestDTO;
import com.movie_be.movie.dto.BookingSearchResponse;
import com.movie_be.movie.dto.InvoiceDTO;
import com.movie_be.movie.service.BookingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<?> createBooking(@Valid @RequestBody BookingRequestDTO request) {
        try {
            InvoiceDTO created = bookingService.createBooking(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Internal error"));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<BookingSearchResponse>> searchBookings(
            @RequestParam(required = false) String bookingId,
            @RequestParam(required = false) String accountId,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(required = false) String identityCard) {
        return ResponseEntity.ok(
                bookingService.searchBookings(bookingId, accountId, phoneNumber, identityCard));
    }

    @PostMapping("/{bookingId}/confirm")
    public ResponseEntity<BookingSearchResponse> confirmBooking(
            @PathVariable String bookingId,
            @RequestBody(required = false) com.movie_be.movie.dto.ConfirmBookingRequest request) {
        Integer useScore = request != null ? request.getUseScore() : 0;
        BookingSearchResponse response = bookingService.confirmBooking(bookingId, useScore);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{invoiceId}/checkin")
    public ResponseEntity<BookingSearchResponse> checkinTicket(@PathVariable String invoiceId) {
        BookingSearchResponse response = bookingService.checkinTicket(invoiceId.trim());
        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleIllegalState(IllegalStateException ex) {
        String msg = ex.getMessage();
        if (msg != null && (msg.contains("already confirmed") || msg.contains("đã được check-in"))) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(msg);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(msg);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = ex.getMessage();
        if (msg != null && (msg.contains("Booking not found") || msg.contains("Schedule not found"))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(msg);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(msg);
    }
}
