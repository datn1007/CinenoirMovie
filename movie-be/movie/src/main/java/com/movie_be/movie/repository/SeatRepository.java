package com.movie_be.movie.repository;

import com.movie_be.movie.entity.seat.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Integer> {
    List<Seat> findAllByCinemaRoomIdOrderBySeatRowAscSeatColumnAsc(Integer cinemaRoomId);
}
