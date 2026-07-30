package com.movie_be.movie.repository;

import com.movie_be.movie.entity.cinemaroom.CinemaRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CinemaRoomRepository extends JpaRepository<CinemaRoom, Integer> {

    // Coi null status là active (phòng cũ trong DB chưa có cột status)
    @Query("SELECT r FROM CinemaRoom r WHERE r.status IS NULL OR r.status = 1")
    List<CinemaRoom> findAllActive();
}
