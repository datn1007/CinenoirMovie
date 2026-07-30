package com.movie_be.movie.entity.invoice;

import com.movie_be.movie.entity.account.Account;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoice")
@Getter
@Setter
@NoArgsConstructor
public class Invoice {

    @Id
    @Column(name = "invoice_id", length = 10)
    private String invoiceId;

    @Column(name = "booking_date")
    private LocalDateTime bookingDate;

    @Column(name = "movie_name", nullable = false)
    private String movieName;

    @Column(name = "schedule_show", nullable = false)
    private LocalDate scheduleShow;

    @Column(name = "schedule_show_time", nullable = false)
    private String scheduleShowTime;

    @Column(name = "seat", nullable = false)
    private String seat;

    @Column(name = "add_score")
    private Integer addScore;

    @Column(name = "use_score")
    private Integer useScore;

    @Column(name = "total_money", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalMoney;

    @Column(name = "status")
    private Short status;

    /** 0 = chờ xác thực (chưa soát vé), 1 = đã check-in tại rạp */
    @Column(name = "checkin_status")
    private Short checkinStatus = 0;

    @Column(name = "checkin_time")
    private LocalDateTime checkinTime;

    /** THEATER (xem tại rạp, mặc định — cần chọn ghế + check-in) or ONLINE (xem online — không ghế, không check-in) */
    @Column(name = "ticket_mode")
    private String ticketMode = "THEATER";

    @ManyToOne
    @JoinColumn(name = "account_id")
    private Account account;
}

