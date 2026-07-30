package com.movie_be.movie.repository;

import com.movie_be.movie.entity.schedule.ScheduleSeat;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ScheduleSeatRepository extends JpaRepository<ScheduleSeat, Integer> {

    @Query("SELECT ss FROM ScheduleSeat ss WHERE ss.movieId IN " +
           "(SELECT m.movieId FROM Movie m WHERE m.cinemaRoomId = :roomId) " +
           "AND ss.seatStatus = 1")
    List<ScheduleSeat> findBookedByRoom(@Param("roomId") Integer roomId);

    List<ScheduleSeat> findAllByScheduleIdAndSeatIdIn(Integer scheduleId, Collection<Integer> seatIds);

    // Locked (SELECT ... FOR UPDATE): callers use these to check-then-flip seat_status when
    // reserving a seat, so a concurrent request for the same seat must block until the first
    // transaction commits instead of both reading "available" and double-booking the seat.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<ScheduleSeat> findAllByScheduleIdAndSeatRowAndSeatColumnIn(Integer scheduleId, Integer seatRow, Collection<String> seatColumns);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<ScheduleSeat> findAllByShowtimeIdAndSeatRowAndSeatColumnIn(Integer showtimeId, Integer seatRow, Collection<String> seatColumns);

    List<ScheduleSeat> findAllByShowtimeIdAndSeatRowAndSeatColumn(Integer showtimeId, Integer seatRow, String seatColumn);

    List<ScheduleSeat> findAllByScheduleIdAndSeatRowAndSeatColumn(Integer scheduleId, Integer seatRow, String seatColumn);

    List<ScheduleSeat> findAllByScheduleId(Integer scheduleId);

    List<ScheduleSeat> findAllByShowtimeId(Integer showtimeId);

    List<ScheduleSeat> findAllByScheduleIdAndMovieId(Integer scheduleId, String movieId);

    long countByScheduleIdAndSeatStatus(Integer scheduleId, Short seatStatus);

    long countByShowtimeIdAndSeatStatus(Integer showtimeId, Short seatStatus);

    void deleteAllByScheduleId(Integer scheduleId);

    void deleteAllByShowtimeId(Integer showtimeId);

    List<ScheduleSeat> findBySeatIdInAndSeatStatus(List<Integer> seatIds, Short seatStatus);
}
