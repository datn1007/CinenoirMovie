package com.movie_be.movie.service;

import java.util.List;

import org.springframework.lang.NonNull;

import com.movie_be.movie.dto.BookingRequestDTO;
import com.movie_be.movie.dto.BookingSearchResponse;
import com.movie_be.movie.dto.InvoiceDTO;

public interface BookingService {

    /**
     * Create booking based on FE payload.
     * For now: create Invoice record.
     */
    @NonNull
    InvoiceDTO createBooking(@NonNull BookingRequestDTO request);

    /**
     * Search bookings by bookingId, accountId, phoneNumber, or identityCard.
     */
    List<BookingSearchResponse> searchBookings(String bookingId, String accountId, String phoneNumber, String identityCard);

    /**
     * Confirm a booking: deduct score, update status to SUCCESSFUL_BOOKING (status=3).
     */
    BookingSearchResponse confirmBooking(String bookingId, Integer useScore);

    /**
     * Staff check-in: scan/enter the ticket's invoiceId at the door.
     * Marks checkinStatus=1 and records checkinTime. Fails if already checked in.
     */
    BookingSearchResponse checkinTicket(@NonNull String invoiceId);
}

