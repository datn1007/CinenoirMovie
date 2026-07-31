package com.movie_be.movie.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.movie_be.movie.dto.BookingRequestDTO;
import com.movie_be.movie.entity.schedule.ScheduleSeat;
import com.movie_be.movie.repository.ScheduleSeatRepository;
import com.movie_be.movie.service.SeatReservationService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class SeatReservationServiceImpl implements SeatReservationService {

    private final ScheduleSeatRepository scheduleSeatRepository;

    @Override
    public void reserveSeats(BookingRequestDTO request, List<String> normalizedSeatCodes) {
        Integer showtimeId = request.getShowtimeId();
        if (showtimeId == null) {
            try {
                showtimeId = Integer.parseInt(request.getScheduleShow().replaceAll("[^0-9]", ""));
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("showtimeId is required");
            }
        }

        // Validate and update each seat individually
        List<ScheduleSeat> toSave = new ArrayList<>();
        for (String code : normalizedSeatCodes) {
            int[] parts = parseSeatCode(code);
            int seatRow = parts[0];
            String seatColumn = String.valueOf((char) parts[1]);
            List<ScheduleSeat> candidates = scheduleSeatRepository.findAllByShowtimeIdAndSeatRowAndSeatColumnIn(
                    showtimeId,
                    seatRow,
                    java.util.Collections.singletonList(seatColumn)
            );

            if (candidates == null || candidates.isEmpty()) {
                throw new IllegalArgumentException("Seat not found: " + code);
            }

            // Assume 1 candidate per seat
            ScheduleSeat ss = candidates.get(0);
            if (ss.getSeatStatus() != null && ss.getSeatStatus() == 1) {
                throw new IllegalStateException("Seat already booked: " + code);
            }
            String holderId = request.getAccountId();
            boolean heldByOther = ss.getHeldUntil() != null && ss.getHeldUntil().isAfter(LocalDateTime.now())
                    && (holderId == null || !holderId.equals(ss.getHeldBy()));
            if (heldByOther) {
                throw new IllegalStateException("Seat is being held by another customer: " + code);
            }

            ss.setSeatStatus((short) 1);
            ss.setHeldBy(null);
            ss.setHeldUntil(null);
            toSave.add(ss);
        }

        scheduleSeatRepository.saveAll(toSave);
    }

    @Override
    public void releaseBookedSeats(Integer showtimeId, List<String> seatCodes) {
        if (showtimeId == null || seatCodes == null || seatCodes.isEmpty()) return;

        List<ScheduleSeat> toSave = new ArrayList<>();
        for (String code : seatCodes) {
            int[] parts;
            try {
                parts = parseSeatCode(code);
            } catch (IllegalArgumentException e) {
                continue; // skip malformed/non-seat codes
            }
            int seatRow = parts[0];
            String seatColumn = String.valueOf((char) parts[1]);
            List<ScheduleSeat> candidates = scheduleSeatRepository.findAllByShowtimeIdAndSeatRowAndSeatColumnIn(
                    showtimeId, seatRow, java.util.Collections.singletonList(seatColumn));
            for (ScheduleSeat ss : candidates) {
                ss.setSeatStatus((short) 0);
                ss.setHeldBy(null);
                ss.setHeldUntil(null);
                toSave.add(ss);
            }
        }
        scheduleSeatRepository.saveAll(toSave);
    }

    /**
     * FE seat code like A1..H12
     * returns [seatRow(1..8), seatColumnLetter]
     */
    private int[] parseSeatCode(String seatCode) {
        if (seatCode == null || seatCode.length() < 2) throw new IllegalArgumentException("Invalid seat code: " + seatCode);
        char rowChar = seatCode.charAt(0);
        if (rowChar < 'A' || rowChar > 'H') {
            throw new IllegalArgumentException("Invalid seat row: " + rowChar);
        }
        int seatRow = (rowChar - 'A') + 1;
        int colNumber = Integer.parseInt(seatCode.substring(1));
        if (colNumber < 1 || colNumber > 12) {
            throw new IllegalArgumentException("Invalid seat column number: " + colNumber);
        }
        char seatColumnChar = (char) ('A' + (colNumber - 1));
        return new int[]{seatRow, (int) seatColumnChar};
    }
}

