package com.movie_be.movie.controller;

import com.movie_be.movie.dto.ScheduleDTO;
import com.movie_be.movie.dto.ScheduleMovieRequest;
import com.movie_be.movie.dto.ScheduleSeatResponse;
import com.movie_be.movie.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    public List<ScheduleDTO> getAll() {
        return scheduleService.getAll();
    }

    @GetMapping("/{id}")
    public ScheduleDTO getById(@PathVariable Integer id) {
        return scheduleService.getById(id);
    }

    @GetMapping("/movie/{movieId}")
    public List<ScheduleDTO> getByMovie(@PathVariable String movieId) {
        return scheduleService.getByMovie(movieId);
    }

    @GetMapping("/movie/{movieId}/dates")
    public List<String> getDatesByMovie(@PathVariable String movieId) {
        return scheduleService.getDatesByMovie(movieId);
    }

    @GetMapping("/movie/{movieId}/times")
    public List<String> getTimesByMovieAndDate(
            @PathVariable String movieId,
            @RequestParam String showDate) {
        return scheduleService.getTimesByMovieAndDate(movieId, showDate);
    }

    @GetMapping("/movie/{movieId}/rooms")
    public List<ScheduleDTO> getRoomsByMovieDateAndTime(
            @PathVariable String movieId,
            @RequestParam String showDate,
            @RequestParam String scheduleTime) {
        return scheduleService.getRoomsByMovieDateAndTime(movieId, showDate, scheduleTime);
    }

    @PostMapping
    public ResponseEntity<ScheduleDTO> create(@RequestBody ScheduleDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleService.create(dto));
    }

    @PutMapping("/{id}")
    public ScheduleDTO update(@PathVariable Integer id, @RequestBody ScheduleDTO dto) {
        return scheduleService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id) {
        scheduleService.delete(id);
    }

    @PostMapping("/{id}/movies")
    public ResponseEntity<List<ScheduleSeatResponse>> createSeatsForMovie(
            @PathVariable Integer id,
            @RequestBody ScheduleMovieRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(scheduleService.createSeatsForMovie(id, request.getMovieId()));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }
}
