package com.movie_be.movie.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketSellingResponse {
    private String invoiceId;
    private Integer showtimeId;
    private String movieName;
    private String showDate;
    private String showTime;
    private String seats;
    private List<String> bookedSeats;
    private String status;
    private Integer usedScore;
    private Integer remainingScore;
    private BigDecimal totalAmount;
}
