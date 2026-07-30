package com.movie_be.movie.service;

import com.movie_be.movie.dto.BookingRequestDTO;
import java.util.List;

public interface SeatReservationService {
    /**
     * Validate seat availability and mark as booked.
     * Throws IllegalStateException if any seat is already booked.
     */
    void reserveSeats(BookingRequestDTO request, List<String> normalizedSeatCodes);
}

