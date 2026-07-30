package com.movie_be.movie.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.movie_be.movie.dto.TicketSellingRequest;
import com.movie_be.movie.dto.TicketSellingResponse;
import com.movie_be.movie.service.TicketSellingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/ticket-selling")
@RequiredArgsConstructor
public class TicketSellingController {

    private final TicketSellingService ticketSellingService;

    @PostMapping
    public ResponseEntity<TicketSellingResponse> sellTicket(@RequestBody TicketSellingRequest request) {
        TicketSellingResponse response = ticketSellingService.sellTicket(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = ex.getMessage();
        if (msg != null && msg.contains("not found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(msg);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(msg);
    }
}
