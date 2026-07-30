package com.movie_be.movie.entity.movie;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "movie")
@Getter
@Setter
@NoArgsConstructor
public class Movie {

    @Id
    @Column(name = "movie_id", length = 10)
    private String movieId;

    @Column(name = "movie_name_vn", nullable = false)
    private String movieNameVn;

    @Column(name = "movie_name_english")
    private String movieNameEnglish;

    @Column(name = "actor")
    private String actor;

    @Column(name = "director")
    private String director;

    @Column(name = "movie_production_company")
    private String movieProductionCompany;

    @Column(name = "duration", nullable = false)
    private Integer duration;

    @Column(name = "content", length = 1000)
    private String content;

    @Column(name = "version")
    private String version;

    @Column(name = "from_date")
    private LocalDate fromDate;

    @Column(name = "to_date")
    private LocalDate toDate;

    @Column(name = "large_image")
    private String largeImage;

    @Column(name = "small_image")
    private String smallImage;

    @Column(name = "cinema_room_id")
    private Integer cinemaRoomId;

    @Column(name = "trailer_url")
    private String trailerUrl;

    /** Poster image URL on cloud storage (S3). Preferred over the legacy largeImage upload path. */
    @Column(name = "poster_url", length = 500)
    private String posterUrl;

    /** Playback URL for the movie file on cloud storage (S3), used to stream/play the movie on the web. */
    @Column(name = "movie_url", length = 500)
    private String movieUrl;

    /** Đánh giá phim, thang điểm 0-5, lưu dạng chuỗi (VD: "4.5") để hiển thị sao ở FE. */
    @Column(name = "rating")
    private String rating;
}
