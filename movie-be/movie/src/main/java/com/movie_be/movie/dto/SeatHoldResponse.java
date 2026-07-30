package com.movie_be.movie.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class SeatHoldResponse {
    private List<String> heldSeats;
    private List<String> rejectedSeats;
    private String heldUntil;
}
