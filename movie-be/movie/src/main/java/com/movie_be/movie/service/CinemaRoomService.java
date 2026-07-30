package com.movie_be.movie.service;

import com.movie_be.movie.dto.CinemaRoomDTO;
import com.movie_be.movie.dto.SeatStatusDTO;

import java.util.List;

public interface CinemaRoomService {
    List<CinemaRoomDTO> getAllActive();
    CinemaRoomDTO getById(Integer id);
    CinemaRoomDTO create(CinemaRoomDTO dto);
    CinemaRoomDTO update(Integer id, CinemaRoomDTO dto);
    void softDelete(Integer id);
    List<SeatStatusDTO> getSeatsWithStatus(Integer cinemaRoomId);
}
