package com.movie_be.movie.service;

import com.movie_be.movie.dto.MovieDTO;
import com.movie_be.movie.entity.movie.Movie;
import org.springframework.lang.NonNull;

public interface MovieService {
    Movie create(MovieDTO dto);

    /**
     * Update partial: chỉ cập nhật các field trong dto KHÁC null.
     */
    Movie updatePartial(@NonNull String movieId, MovieDTO dto);

    void delete(@NonNull String movieId);

    Movie updateLargeImage(@NonNull String movieId, String imagePath);
    Movie updateSmallImage(@NonNull String movieId, String imagePath);
}

