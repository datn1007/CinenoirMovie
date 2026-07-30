package com.movie_be.movie.controller;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.movie_be.movie.dto.ScheduleSeatResponse;
import com.movie_be.movie.entity.schedule.Schedule;
import com.movie_be.movie.entity.schedule.ScheduleSeat;
import com.movie_be.movie.repository.ScheduleRepository;
import com.movie_be.movie.repository.ScheduleSeatRepository;
import com.movie_be.movie.service.ScheduleService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class ScheduleSeatController {

    private final ScheduleSeatRepository scheduleSeatRepository;
    private final ScheduleRepository scheduleRepository;
    private final ScheduleService scheduleService;

    @GetMapping("/api/schedule-seats")
    public ResponseEntity<List<ScheduleSeatResponse>> getSeatAvailability(
            @RequestParam(required = false) Integer showtimeId,
            @RequestParam(required = false) Integer scheduleId,
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) String holderId) {
        Integer resolvedShowtimeId = showtimeId != null ? showtimeId : scheduleId;
        return ResponseEntity.ok(loadSeats(resolvedShowtimeId, movieId, holderId));
    }

    @GetMapping("/api/showtimes/{showtimeId}/seats")
    public ResponseEntity<List<ScheduleSeatResponse>> getSeatsByShowtime(
            @PathVariable Integer showtimeId,
            @RequestParam(required = false) String holderId) {
        return ResponseEntity.ok(loadSeats(showtimeId, null, holderId));
    }

    private List<ScheduleSeatResponse> loadSeats(Integer showtimeId, String movieId, String holderId) {
        if (showtimeId == null) {
            throw new IllegalArgumentException("showtimeId is required");
        }
        Schedule schedule = scheduleRepository.findById(showtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Showtime not found: " + showtimeId));
        if (movieId != null && !movieId.isBlank() && !movieId.equals(schedule.getMovieId())) {
            throw new IllegalArgumentException("Showtime does not belong to movie: " + movieId);
        }

        List<ScheduleSeat> seats = scheduleSeatRepository.findAllByShowtimeId(showtimeId);
        if (seats.isEmpty()) {
            seats = scheduleSeatRepository.findAllByScheduleId(showtimeId);
            if (!seats.isEmpty()) {
                for (ScheduleSeat seat : seats) {
                    seat.setShowtimeId(showtimeId);
                }
                seats = scheduleSeatRepository.saveAll(seats);
            }
        }

        // Auto-create seats from cinema room layout on first access
        if (seats.isEmpty()) {
            return scheduleService.createSeatsForMovie(showtimeId, schedule.getMovieId());
        }

        return seats.stream()
                .sorted(Comparator.comparing(ScheduleSeat::getSeatRow)
                        .thenComparing(ScheduleSeat::getSeatColumn))
                .map(seat -> toResponse(seat, holderId))
                .collect(Collectors.toList());
    }

    private ScheduleSeatResponse toResponse(ScheduleSeat ss, String holderId) {
        String seatCode = String.valueOf((char) ('A' + ss.getSeatRow() - 1))
                + (ss.getSeatColumn().charAt(0) - 'A' + 1);

        LocalDateTime now = LocalDateTime.now();
        boolean heldByOther = ss.getHeldUntil() != null && ss.getHeldUntil().isAfter(now)
                && (holderId == null || !holderId.equals(ss.getHeldBy()));

        ScheduleSeatResponse resp = new ScheduleSeatResponse();
        resp.setSeatCode(seatCode);
        resp.setSeatType(ss.getSeatType());
        resp.setBooked(ss.getSeatStatus() != null && ss.getSeatStatus() == 1);
        resp.setLocked(heldByOther);
        if (heldByOther) {
            resp.setHoldSecondsLeft((int) Duration.between(now, ss.getHeldUntil()).getSeconds());
        }
        return resp;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }
}
