package com.movie_be.movie.dto;

import java.math.BigDecimal;

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
public class BookingSearchResponse {
    private String invoiceId;
    private String bookingDate;
    private String movieName;
    private String showDate;
    private String showTime;
    private String seats;
    private Integer usedScore;
    private BigDecimal totalMoney;
    private Short status;
    private String accountId;
    private String fullName;
    private String phoneNumber;
    private String identityCard;

    // 0 = chờ xác thực, 1 = đã check-in
    private Short checkinStatus;

    // dạng yyyy-MM-dd HH:mm, null nếu chưa check-in
    private String checkinTime;

    // "THEATER" hoặc "ONLINE"
    private String ticketMode;

    // "PAYOS" hoặc "CASH"
    private String paymentMethod;

    // "PENDING" | "PAID" | "CANCELLED" | "FAILED" | null (bookings created before this field existed)
    private String paymentStatus;
}