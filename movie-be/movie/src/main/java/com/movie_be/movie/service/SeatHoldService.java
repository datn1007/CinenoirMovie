package com.movie_be.movie.service;

import java.util.List;

import com.movie_be.movie.dto.SeatHoldResponse;

public interface SeatHoldService {
    /**
     * Hold the given seats for holderId for HOLD_MINUTES, unless a seat is already
     * booked or held by a different holder whose hold hasn't expired yet.
     */
    SeatHoldResponse hold(Integer showtimeId, List<String> seatCodes, String holderId);

    /**
     * Release any of the given seats currently held by holderId. Seats not held by
     * holderId (already released, expired, or held by someone else) are left as-is.
     */
    void release(Integer showtimeId, List<String> seatCodes, String holderId);
}
