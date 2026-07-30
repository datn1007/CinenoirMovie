package com.movie_be.movie.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleSeatDTO {
    private Integer scheduleSeatId;
    private Integer scheduleId;
    private Integer seatRow;
    private String seatColumn;
    private Short seatStatus;
    private Short seatType;
}
