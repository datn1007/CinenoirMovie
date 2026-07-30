package com.movie_be.movie.controller;

import com.movie_be.movie.dto.MovieDTO;
import com.movie_be.movie.entity.movie.Movie;
import com.movie_be.movie.repository.MovieRepository;
import com.movie_be.movie.service.MovieService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;



import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieRepository movieRepository;
    private final MovieService movieService;

    @GetMapping
    public List<MovieDTO> getAllMovies() {
        return movieRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public MovieDTO getMovieById(@PathVariable String id) {
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + id));
        return toDto(movie);
    }

    @PostMapping
    public ResponseEntity<MovieDTO> createMovie(@RequestBody MovieDTO dto) {

        Movie created = movieService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(created));
    }

    @PutMapping("/{id}")
    public MovieDTO updateMoviePartial(@PathVariable String id, @RequestBody MovieDTO dto) {

        Movie updated = movieService.updatePartial(id, dto);
        return toDto(updated);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMovie(@PathVariable String id) {

        movieService.delete(id);
    }


    private MovieDTO toDto(Movie movie) {
        MovieDTO dto = new MovieDTO();

        // FE-compatible mapping
        dto.setId(movie.getMovieId());
        dto.setTitle(movie.getMovieNameVn());
        dto.setTitleEnglish(movie.getMovieNameEnglish());
        dto.setDescription(movie.getContent());
        dto.setSynopsis(movie.getContent());
        dto.setGenre(movie.getVersion());                       // dùng version làm thể loại hiển thị
        dto.setDuration(movie.getDuration());
        dto.setIsVip(containsIgnoreCase(movie.getVersion(), "VIP"));
        dto.setIsImax(containsIgnoreCase(movie.getVersion(), "IMAX"));
        dto.setStatus(deriveStatus(movie.getFromDate(), movie.getToDate()));
        // Prefer the cloud (S3) poster URL; fall back to the legacy uploaded-file path for older records.
        dto.setImageUrl(
                movie.getPosterUrl() != null && !movie.getPosterUrl().isBlank()
                        ? movie.getPosterUrl()
                        : movie.getLargeImage()
        );
        dto.setShowtimes(List.of());                           // suất chiếu quản lý ở bảng riêng
        dto.setRating(movie.getRating());
        dto.setLanguage(null);
        dto.setShowtime(null);

        // Extra info
        dto.setActor(movie.getActor());
        dto.setDirector(movie.getDirector());
        dto.setVersion(movie.getVersion());
        dto.setFromDate(movie.getFromDate() != null ? movie.getFromDate().toString() : null);
        dto.setToDate(movie.getToDate() != null ? movie.getToDate().toString() : null);
        dto.setTrailerUrl(movie.getTrailerUrl());
        dto.setMovieUrl(movie.getMovieUrl());
        dto.setCinemaRoomId(movie.getCinemaRoomId());

        return dto;
    }

    private String deriveStatus(LocalDate fromDate, LocalDate toDate) {
        if (fromDate == null) return "Now Showing";
        LocalDate today = LocalDate.now();
        if (fromDate.isAfter(today.plusDays(1))) return "Coming Soon";
        if (fromDate.equals(today.plusDays(1)))  return "Starts Tomorrow";
        return "Now Showing";
    }

    private boolean containsIgnoreCase(String source, String keyword) {
        return source != null && source.toUpperCase().contains(keyword);
    }
}

