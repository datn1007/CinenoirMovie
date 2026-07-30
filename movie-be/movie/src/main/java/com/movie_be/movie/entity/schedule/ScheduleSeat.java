package com.movie_be.movie.entity.schedule;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "schedule_seat")
@Getter
@Setter
@NoArgsConstructor
public class ScheduleSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "schedule_seat_id")
    private Integer scheduleSeatId;

    @Column(name = "movie_id")
    private String movieId;

    @Column(name = "schedule_id")
    private Integer scheduleId;

    @Column(name = "showtime_id")
    private Integer showtimeId;

    @Column(name = "seat_id")
    private Integer seatId;

    @Column(name = "seat_row")
    private Integer seatRow;

    @Column(name = "seat_column")
    private String seatColumn;

    @Column(name = "seat_status")
    private Short seatStatus;

    @Column(name = "seat_type")
    private Short seatType;

    // Temporary 5-minute hold while a customer is selecting this seat, before they
    // finish paying. held_until is checked lazily (no cleanup job): a hold past its
    // expiry is simply treated as if it doesn't exist.
    @Column(name = "held_until")
    private LocalDateTime heldUntil;

    @Column(name = "held_by")
    private String heldBy;
}
