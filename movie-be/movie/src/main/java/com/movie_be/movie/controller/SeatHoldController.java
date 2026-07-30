package com.movie_be.movie.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.movie_be.movie.dto.SeatHoldRequest;
import com.movie_be.movie.dto.SeatHoldResponse;
import com.movie_be.movie.service.SeatHoldService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/showtimes/{showtimeId}/seats")
@RequiredArgsConstructor
public class SeatHoldController {

    private final SeatHoldService seatHoldService;

    @PostMapping("/hold")
    public ResponseEntity<SeatHoldResponse> hold(@PathVariable Integer showtimeId, @RequestBody SeatHoldRequest request) {
        return ResponseEntity.ok(seatHoldService.hold(showtimeId, request.getSeatCodes(), request.getHolderId()));
    }

    @PostMapping("/release")
    public ResponseEntity<Void> release(@PathVariable Integer showtimeId, @RequestBody SeatHoldRequest request) {
        seatHoldService.release(showtimeId, request.getSeatCodes(), request.getHolderId());
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }
}
