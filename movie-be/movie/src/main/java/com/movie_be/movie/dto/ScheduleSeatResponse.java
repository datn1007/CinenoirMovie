package com.movie_be.movie.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleSeatResponse {
    private String seatCode;
    private Short seatType;
    private boolean booked;
    private boolean locked;
    private Integer holdSecondsLeft;
}