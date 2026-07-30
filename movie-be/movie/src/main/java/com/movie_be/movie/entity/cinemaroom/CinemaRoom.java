package com.movie_be.movie.entity.cinemaroom;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cinema_room")
@Getter
@Setter
@NoArgsConstructor
public class CinemaRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "cinema_room_seq")
    @SequenceGenerator(name = "cinema_room_seq", sequenceName = "cinema_room_id_seq", allocationSize = 1, initialValue = 100)
    @Column(name = "cinema_room_id")
    private Integer cinemaRoomId;

    @Column(name = "cinema_room_name", nullable = false)
    private String cinemaRoomName;

    @Column(name = "seat_quantity", nullable = false)
    private Integer seatQuantity;

    // 1 = active, 0 = soft-deleted
    @Column(name = "status", columnDefinition = "integer DEFAULT 1")
    private Integer status = 1;
}
