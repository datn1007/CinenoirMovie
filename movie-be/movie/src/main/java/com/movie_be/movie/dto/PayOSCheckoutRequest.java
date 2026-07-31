package com.movie_be.movie.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class PayOSCheckoutRequest {

    /** showtime/schedule id as string — same convention as BookingRequestDTO.scheduleShow */
    @NotBlank(message = "scheduleShow is required")
    private String scheduleShow;

    @NotBlank(message = "scheduleShowTime is required")
    private String scheduleShowTime;

    @NotBlank(message = "movieName is required")
    private String movieName;

    /** comma-separated seat codes — required for THEATER, ignored for ONLINE */
    private String seat;

    /** "THEATER" (default) or "ONLINE" */
    private String ticketMode;

    /** only used when ticketMode is ONLINE */
    private Integer quantity;

    @NotNull(message = "showtimeId is required")
    private Integer showtimeId;

    @NotBlank(message = "accountId is required")
    private String accountId;

    @NotNull(message = "totalMoney is required")
    private BigDecimal totalMoney;

    private Integer useScore;
    private Integer addScore;
    private String customerEmail;

    /** Base return/cancel URLs — the backend appends ?orderCode=<n> before sending to PayOS. */
    @NotBlank(message = "returnUrl is required")
    private String returnUrl;

    @NotBlank(message = "cancelUrl is required")
    private String cancelUrl;
}
