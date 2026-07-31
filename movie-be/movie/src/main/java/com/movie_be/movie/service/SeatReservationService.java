package com.movie_be.movie.service;

import com.movie_be.movie.dto.BookingRequestDTO;
import java.util.List;

public interface SeatReservationService {
    /**
     * Validate seat availability and mark as booked.
     * Throws IllegalStateException if any seat is already booked.
     */
    void reserveSeats(BookingRequestDTO request, List<String> normalizedSeatCodes);

    /**
     * Release seats that were previously marked booked (seatStatus=1) back to available.
     * Used when a PayOS checkout is cancelled or abandoned. Silently skips codes that don't
     * parse as valid seats (defensive against stray "Online x2"-style strings).
     */
    void releaseBookedSeats(Integer showtimeId, List<String> seatCodes);
}

