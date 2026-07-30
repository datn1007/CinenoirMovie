package com.movie_be.movie.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleDTO {
    private Integer scheduleId;
    private String movieId;
    private String movieTitle;
    private String showDate;
    private String scheduleTime;
    private Integer cinemaRoomId;
    private String cinemaRoomName;
    private Integer status;
    private String note;
    private Boolean hasBookedSeats;

    // Alias fields for the user booking flow. Keep old fields so admin UI remains compatible.
    private Integer showtimeId;
    private String movieName;
    private Integer seatQuantity;
    private String statusLabel;
}
