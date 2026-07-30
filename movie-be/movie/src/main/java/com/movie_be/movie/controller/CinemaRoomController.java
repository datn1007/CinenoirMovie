package com.movie_be.movie.controller;

import com.movie_be.movie.dto.CinemaRoomDTO;
import com.movie_be.movie.dto.SeatStatusDTO;
import com.movie_be.movie.service.CinemaRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cinema-rooms")
@RequiredArgsConstructor
public class CinemaRoomController {

    private final CinemaRoomService cinemaRoomService;

    @GetMapping
    public List<CinemaRoomDTO> getAllActive() {
        return cinemaRoomService.getAllActive();
    }

    @GetMapping("/{id}")
    public CinemaRoomDTO getById(@PathVariable Integer id) {
        return cinemaRoomService.getById(id);
    }

    @GetMapping("/{id}/seats")
    public List<SeatStatusDTO> getSeatsWithStatus(@PathVariable Integer id) {
        return cinemaRoomService.getSeatsWithStatus(id);
    }

    @PostMapping
    public ResponseEntity<CinemaRoomDTO> create(@Valid @RequestBody CinemaRoomDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cinemaRoomService.create(dto));
    }

    @PutMapping("/{id}")
    public CinemaRoomDTO update(@PathVariable Integer id, @Valid @RequestBody CinemaRoomDTO dto) {
        return cinemaRoomService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void softDelete(@PathVariable Integer id) {
        cinemaRoomService.softDelete(id);
    }
}
