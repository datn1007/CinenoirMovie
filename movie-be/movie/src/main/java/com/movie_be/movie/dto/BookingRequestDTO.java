package com.movie_be.movie.dto;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;



@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BookingRequestDTO {

    /** Invoice id to use from FE */
    private String invoiceId;

    /** yyyy-MM-dd */
    @NotBlank(message = "scheduleShow is required")
    private String scheduleShow;

    /** HH:mm string */
    @NotBlank(message = "scheduleShowTime is required")
    private String scheduleShowTime;

    /** movie title from FE */
    @NotBlank(message = "movieName is required")
    private String movieName;

    /** seats as comma-separated string (e.g. "H1,H2") from FE — required for THEATER tickets, ignored for ONLINE */
    private String seat;

    /** "THEATER" (default, needs a seat + check-in) or "ONLINE" (no seat, no check-in) */
    private String ticketMode;

    /** Number of online-viewing tickets purchased. Only used when ticketMode is ONLINE. */
    private Integer quantity;

    /** Parsed seats list, derived from seat string */
    @JsonIgnore
    public List<String> getSeatList() {
        if (seat == null || seat.isBlank()) return Collections.emptyList();
        return Arrays.stream(seat.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    @JsonIgnore
    public boolean isOnline() {
        return "ONLINE".equalsIgnoreCase(ticketMode);
    }

    private Integer addScore;
    private Integer useScore;

    private BigDecimal totalMoney;

    /** optional */
    @NotNull(message = "status is required")
    private Short status;

    /** join account */
    @NotBlank(message = "accountId is required")
    private String accountId;

    /** showtime/schedule id for seat reservation */
    @NotNull(message = "showtimeId is required")
    private Integer showtimeId;

    /** Optional: where to email the ticket. Falls back to the account's registered email if blank. */
    private String customerEmail;

    /** Optional receipt breakdown (as shown to the customer in the FE bill) — used only to render the confirmation email, not stored on the invoice. */
    private BigDecimal ticketAmount;
    private BigDecimal serviceFee;
    private BigDecimal comboAmount;
    private BigDecimal voucherDiscount;
}

