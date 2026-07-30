package com.movie_be.movie.repository;

import com.movie_be.movie.entity.schedule.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Integer> {
    boolean existsByShowDateAndScheduleTimeAndCinemaRoomId(LocalDate showDate, String scheduleTime, Integer cinemaRoomId);

    boolean existsByShowDateAndScheduleTimeAndCinemaRoomIdAndScheduleIdNot(
            LocalDate showDate,
            String scheduleTime,
            Integer cinemaRoomId,
            Integer scheduleId
    );

    List<Schedule> findAllByMovieIdOrderByShowDateAscScheduleTimeAscCinemaRoomIdAsc(String movieId);

    List<Schedule> findAllByMovieIdAndShowDateOrderByScheduleTimeAscCinemaRoomIdAsc(String movieId, LocalDate showDate);

    List<Schedule> findAllByMovieIdAndShowDateAndScheduleTimeOrderByCinemaRoomIdAsc(String movieId, LocalDate showDate, String scheduleTime);

    List<Schedule> findAllByCinemaRoomIdAndShowDateOrderByScheduleTimeAsc(Integer cinemaRoomId, LocalDate showDate);

    List<Schedule> findAllByShowDateAndScheduleTime(LocalDate showDate, String scheduleTime);
}
