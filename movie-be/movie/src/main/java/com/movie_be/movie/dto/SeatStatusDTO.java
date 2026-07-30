package com.movie_be.movie.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class SeatStatusDTO {
    private Integer seatId;
    private Integer seatRow;
    private String seatColumn;
    private Short seatType;
    private boolean booked;
}
