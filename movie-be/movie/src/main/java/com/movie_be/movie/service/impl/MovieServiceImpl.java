package com.movie_be.movie.service.impl;

import com.movie_be.movie.dto.MovieDTO;
import com.movie_be.movie.entity.movie.Movie;
import com.movie_be.movie.repository.MovieRepository;
import com.movie_be.movie.service.MovieService;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class MovieServiceImpl implements MovieService {



    private final MovieRepository movieRepository;

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd-MM-yyyy");

    /** Đánh giá phim phải là số từ 0 đến 5 (cho phép thập phân, VD 4.5); trả về null nếu không nhập. */
    private String validateRating(String rating) {
        if (rating == null || rating.isBlank()) return null;
        double value;
        try {
            value = Double.parseDouble(rating.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Rate phim phải là số, từ 0 đến 5");
        }
        if (value < 0 || value > 5) {
            throw new IllegalArgumentException("Rate phim phải là số, từ 0 đến 5");
        }
        return rating.trim();
    }

    @Override
    public Movie create(MovieDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("MovieDTO is null");
        }
        if (dto.getId() == null || dto.getId().isBlank()) {
            throw new IllegalArgumentException("movie id is required");
        }

        Movie movie = new Movie();
        movie.setMovieId(dto.getId());


        if (dto.getTitle() == null || dto.getTitle().isBlank()) {
            throw new IllegalArgumentException("movie title (VN) is required");
        }
        if (dto.getDuration() == null) {
            throw new IllegalArgumentException("movie duration is required");
        }
        if (dto.getDuration() <= 0 || dto.getDuration() > 600) {
            throw new IllegalArgumentException("Thời lượng phim phải trong khoảng 1-600 phút");
        }

        // Title: FE có thể gửi field khác nhau.
        // Ưu tiên dto.title; nếu null thì lấy dto.titleEnglish (tránh trường hợp Swagger field lẫn nhau).
        if (dto.getTitle() != null) {
            movie.setMovieNameVn(dto.getTitle());
        }
        if (dto.getTitleEnglish() != null) {
            movie.setMovieNameEnglish(dto.getTitleEnglish());
        }

        movie.setDirector(dto.getDirector());
        movie.setActor(dto.getActor());
        movie.setVersion(dto.getVersion());
        movie.setDuration(dto.getDuration());


        if (dto.getDescription() != null) {
            movie.setContent(dto.getDescription());
        } else if (dto.getSynopsis() != null) {
            movie.setContent(dto.getSynopsis());
        }

        movie.setPosterUrl(dto.getImageUrl());
        movie.setTrailerUrl(dto.getTrailerUrl());
        movie.setMovieUrl(dto.getMovieUrl());
        movie.setRating(validateRating(dto.getRating()));
        movie.setCinemaRoomId(dto.getCinemaRoomId());

        // FROM DATE
        if (dto.getFromDate() != null && !dto.getFromDate().isBlank()) {
            try {
                movie.setFromDate(
                        LocalDate.parse(dto.getFromDate(), DATE_FORMAT)
                );
            } catch (Exception e) {
                throw new IllegalArgumentException(
                    "fromDate must be in format dd-MM-yyyy (15-07-2026) or yyyy-MM-dd (2026-07-15)"
                );
            }
        }

        // TO DATE
        if (dto.getToDate() != null && !dto.getToDate().isBlank()) {
            try {
                movie.setToDate(
                        LocalDate.parse(dto.getToDate(), DATE_FORMAT)
                );
            } catch (Exception e) {
                throw new IllegalArgumentException(
                        "toDate must be in format dd-MM-yyyy"
                );
            }
        }

        return movieRepository.save(movie);
    }

    @Override
    public Movie updatePartial(@NonNull String movieId, MovieDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("MovieDTO is null");
        }

        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + movieId));

        if (dto.getTitle() != null) {
            movie.setMovieNameVn(dto.getTitle());
        }

        if (dto.getTitleEnglish() != null) {
            movie.setMovieNameEnglish(dto.getTitleEnglish());
        }

        if (dto.getDirector() != null) {
            movie.setDirector(dto.getDirector());
        }

        if (dto.getActor() != null) {
            movie.setActor(dto.getActor());
        }

        if (dto.getVersion() != null) {
            movie.setVersion(dto.getVersion());
        }

        if (dto.getDuration() != null) {
            if (dto.getDuration() <= 0 || dto.getDuration() > 600) {
                throw new IllegalArgumentException("Thời lượng phim phải trong khoảng 1-600 phút");
            }
            movie.setDuration(dto.getDuration());
        }

        if (dto.getDescription() != null) {
            movie.setContent(dto.getDescription());
        } else if (dto.getSynopsis() != null) {
            movie.setContent(dto.getSynopsis());
        }

        if (dto.getImageUrl() != null) {
            movie.setPosterUrl(dto.getImageUrl());
        }

        if (dto.getTrailerUrl() != null) {
            movie.setTrailerUrl(dto.getTrailerUrl());
        }

        if (dto.getMovieUrl() != null) {
            movie.setMovieUrl(dto.getMovieUrl());
        }

        if (dto.getRating() != null) {
            movie.setRating(validateRating(dto.getRating()));
        }

        if (dto.getCinemaRoomId() != null) {
            movie.setCinemaRoomId(dto.getCinemaRoomId());
        }

        // FROM DATE
        if (dto.getFromDate() != null && !dto.getFromDate().isBlank()) {
            try {
                movie.setFromDate(
                        LocalDate.parse(dto.getFromDate(), DATE_FORMAT)
                );
            } catch (Exception e) {
                throw new IllegalArgumentException(
                        "fromDate must be in format dd-MM-yyyy"
                );
            }
        }

        // TO DATE
        if (dto.getToDate() != null && !dto.getToDate().isBlank()) {
            try {
                movie.setToDate(
                        LocalDate.parse(dto.getToDate(), DATE_FORMAT)
                );
            } catch (Exception e) {
                throw new IllegalArgumentException(
                        "toDate must be in format dd-MM-yyyy"
                );
            }
        }

        return movieRepository.save(movie);
    }

    @Override
    public void delete(@NonNull String movieId) {
        if (!movieRepository.existsById(movieId)) {
            throw new RuntimeException("Movie not found: " + movieId);
        }
        movieRepository.deleteById(movieId);
    }

    @Override
    public Movie updateLargeImage(@NonNull String movieId, String imagePath) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + movieId));
        movie.setLargeImage(imagePath);
        return movieRepository.save(movie);
    }

    @Override
    public Movie updateSmallImage(@NonNull String movieId, String imagePath) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + movieId));
        movie.setSmallImage(imagePath);
        return movieRepository.save(movie);
    }
}