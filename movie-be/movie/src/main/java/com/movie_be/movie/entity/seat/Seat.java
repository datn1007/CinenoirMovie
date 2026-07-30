package com.movie_be.movie.entity.seat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "seat")
@Getter
@Setter
@NoArgsConstructor
public class Seat {

    @Id
    @Column(name = "seat_id")
    private Integer seatId;

    @Column(name = "seat_row")
    private Integer seatRow;

    @Column(name = "seat_column")
    private String seatColumn;

    @Column(name = "seat_type")
    private Short seatType;

    @Column(name = "seat_status")
    private Short seatStatus;

    @Column(name = "cinema_room_id")
    private Integer cinemaRoomId;
}
