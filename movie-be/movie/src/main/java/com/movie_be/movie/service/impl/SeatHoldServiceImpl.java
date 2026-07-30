package com.movie_be.movie.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.movie_be.movie.dto.SeatHoldResponse;
import com.movie_be.movie.entity.schedule.ScheduleSeat;
import com.movie_be.movie.repository.ScheduleSeatRepository;
import com.movie_be.movie.service.SeatHoldService;
import com.movie_be.movie.util.SeatCodeUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class SeatHoldServiceImpl implements SeatHoldService {

    public static final int HOLD_MINUTES = 5;

    private final ScheduleSeatRepository scheduleSeatRepository;

    @Override
    public SeatHoldResponse hold(Integer showtimeId, List<String> seatCodes, String holderId) {
        if (holderId == null || holderId.isBlank()) {
            throw new IllegalArgumentException("holderId is required");
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(HOLD_MINUTES);

        List<String> heldSeats = new ArrayList<>();
        List<String> rejectedSeats = new ArrayList<>();
        List<ScheduleSeat> toSave = new ArrayList<>();

        for (String code : seatCodes) {
            int[] parts = SeatCodeUtil.parse(code);
            List<ScheduleSeat> candidates = scheduleSeatRepository.findAllByShowtimeIdAndSeatRowAndSeatColumnIn(
                    showtimeId, parts[0], Collections.singletonList(String.valueOf((char) parts[1])));

            if (candidates.isEmpty()) {
                rejectedSeats.add(code);
                continue;
            }
            ScheduleSeat seat = candidates.get(0);

            boolean booked = seat.getSeatStatus() != null && seat.getSeatStatus() == 1;
            boolean heldByOther = seat.getHeldUntil() != null && seat.getHeldUntil().isAfter(now)
                    && !holderId.equals(seat.getHeldBy());

            if (booked || heldByOther) {
                rejectedSeats.add(code);
                continue;
            }

            seat.setHeldBy(holderId);
            seat.setHeldUntil(expiresAt);
            toSave.add(seat);
            heldSeats.add(code);
        }

        scheduleSeatRepository.saveAll(toSave);
        return new SeatHoldResponse(heldSeats, rejectedSeats, expiresAt.toString());
    }

    @Override
    public void release(Integer showtimeId, List<String> seatCodes, String holderId) {
        if (holderId == null || holderId.isBlank()) return;
        List<ScheduleSeat> toSave = new ArrayList<>();

        for (String code : seatCodes) {
            int[] parts;
            try {
                parts = SeatCodeUtil.parse(code);
            } catch (IllegalArgumentException e) {
                continue;
            }
            List<ScheduleSeat> candidates = scheduleSeatRepository.findAllByShowtimeIdAndSeatRowAndSeatColumnIn(
                    showtimeId, parts[0], Collections.singletonList(String.valueOf((char) parts[1])));

            for (ScheduleSeat seat : candidates) {
                if (holderId.equals(seat.getHeldBy())) {
                    seat.setHeldBy(null);
                    seat.setHeldUntil(null);
                    toSave.add(seat);
                }
            }
        }

        scheduleSeatRepository.saveAll(toSave);
    }
}
