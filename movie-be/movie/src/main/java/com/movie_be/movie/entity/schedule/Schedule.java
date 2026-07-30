package com.movie_be.movie.entity.schedule;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "schedule")
@Getter
@Setter
@NoArgsConstructor
public class Schedule {

    @Id
    @Column(name = "schedule_id")
    private Integer scheduleId;

    @Column(name = "schedule_time", nullable = false)
    private String scheduleTime;

    @Column(name = "movie_id", length = 10)
    private String movieId;

    @Column(name = "show_date")
    private LocalDate showDate;

    @Column(name = "cinema_room_id")
    private Integer cinemaRoomId;

    @Column(name = "status")
    private Integer status = 1;

    @Column(name = "note", length = 500)
    private String note;
}
