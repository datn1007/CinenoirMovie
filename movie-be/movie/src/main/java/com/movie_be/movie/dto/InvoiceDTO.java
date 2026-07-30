package com.movie_be.movie.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceDTO {

    // FE dùng id
    private String id;

    // dạng yyyy-MM-dd
    private String bookingDate;


    private String movieName;

    // dạng yyyy-MM-dd (LocalDate sẽ parse trong service)
    private String scheduleShow;


    private String scheduleShowTime;

    private String seat;

    private Integer addScore;

    private Integer useScore;

    private BigDecimal totalMoney;

    private Short status;

    // gửi accountId để join Account
    private String accountId;

    // 0 = chờ xác thực, 1 = đã check-in
    private Short checkinStatus;

    // dạng yyyy-MM-dd HH:mm, null nếu chưa check-in
    private String checkinTime;

    // "THEATER" hoặc "ONLINE"
    private String ticketMode;
}

