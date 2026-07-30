package com.movie_be.movie.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CinemaRoomDTO {
    private Integer cinemaRoomId;

    @NotBlank(message = "Tên phòng không được để trống")
    private String cinemaRoomName;

    @NotNull(message = "Số ghế không được để trống")
    @Min(value = 1, message = "Số ghế phải lớn hơn 0")
    @Max(value = 500, message = "Số ghế không được vượt quá 500")
    private Integer seatQuantity;

    private Integer status;
}
