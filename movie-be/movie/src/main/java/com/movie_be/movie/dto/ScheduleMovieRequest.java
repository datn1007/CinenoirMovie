package com.movie_be.movie.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ScheduleMovieRequest {
    private String movieId;
    private String showDate;
    private Integer cinemaRoomId;
}
