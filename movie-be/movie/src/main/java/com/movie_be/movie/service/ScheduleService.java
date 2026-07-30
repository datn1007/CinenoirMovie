package com.movie_be.movie.service;

import com.movie_be.movie.dto.ScheduleDTO;
import com.movie_be.movie.dto.ScheduleSeatResponse;

import java.util.List;

public interface ScheduleService {
    List<ScheduleDTO> getAll();

    ScheduleDTO getById(Integer scheduleId);

    List<ScheduleDTO> getByMovie(String movieId);

    List<String> getDatesByMovie(String movieId);

    List<String> getTimesByMovieAndDate(String movieId, String showDate);

    List<ScheduleDTO> getRoomsByMovieDateAndTime(String movieId, String showDate, String scheduleTime);

    ScheduleDTO create(ScheduleDTO dto);

    ScheduleDTO update(Integer scheduleId, ScheduleDTO dto);

    void delete(Integer scheduleId);

    List<ScheduleSeatResponse> createSeatsForMovie(Integer scheduleId, String movieId);
}
