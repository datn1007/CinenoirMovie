package com.movie_be.movie.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin phim")
public class MovieDTO {
    @Schema(description = "Mã phim", example = "M-101")
    private String id;

    @Schema(description = "Tên phim (Tiếng Việt)", example = "Endgame")
    private String title;

    @Schema(description = "Mô tả", example = "Hành trình khám phá vũ trụ")
    private String description;

    @Schema(description = "Tóm tắt nội dung")
    private String synopsis;

    @Schema(description = "Thể loại", example = "Hành động")
    private String genre;

    @Schema(description = "Thời lượng (phút)", example = "142")
    private Integer duration;

    @Schema(description = "Có phải phim VIP không?")
    private Boolean isVip;

    @Schema(description = "Có phải IMAX không?")
    private Boolean isImax;

    @Schema(description = "Trạng thái", example = "Now Showing")
    private String status;

    @Schema(description = "URL hình ảnh", example = "/uploads/endgame.jpg")
    private String imageUrl;

    @Schema(description = "Danh sách suất chiếu")
    private List<String> showtimes;

    @Schema(description = "Đánh giá")
    private String rating;

    @Schema(description = "Ngôn ngữ")
    private String language;

    @Schema(description = "Suất chiếu")
    private String showtime;

    @Schema(description = "Tên tiếng Anh", example = "Endgame")
    private String titleEnglish;

    @Schema(description = "Diễn viên", example = "Robert Downey Jr.")
    private String actor;

    @Schema(description = "Đạo diễn", example = "Anthony Russo")
    private String director;

    @Schema(description = "Phiên bản", example = "2D")
    private String version;

    @Schema(description = "Ngày khởi chiếu", example = "2024-01-01")
    private String fromDate;

    @Schema(description = "Ngày kết thúc", example = "2024-02-01")
    private String toDate;

    @Schema(description = "URL trailer phim", example = "https://www.youtube.com/watch?v=abc123")
    private String trailerUrl;

    @Schema(description = "ID phòng chiếu được gắn", example = "1")
    private Integer cinemaRoomId;

    @Schema(description = "URL phim để chiếu trên web (cloud storage)", example = "https://bucket.s3.amazonaws.com/movies/m101.mp4")
    private String movieUrl;
}