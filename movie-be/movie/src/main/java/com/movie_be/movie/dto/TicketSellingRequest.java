package com.movie_be.movie.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TicketSellingRequest {
    private String movieId;
    private Integer scheduleId;
    private Integer showtimeId;
    private String memberId;
    private String accountId;
    private List<String> selectedSeats;
    private Integer useScore;
    private String voucherCode;
}
