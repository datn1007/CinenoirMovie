package com.movie_be.movie.dto;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SeatHoldRequest {
    private List<String> seatCodes;
    private String holderId;
}
