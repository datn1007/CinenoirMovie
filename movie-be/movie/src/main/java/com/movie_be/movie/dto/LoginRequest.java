package com.movie_be.movie.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "Yêu cầu đăng nhập")
public class LoginRequest {

    @NotBlank(message = "Username cannot be blank")
    @Schema(description = "Tên đăng nhập", example = "user1")
    private String username;

    @NotBlank(message = "Password cannot be blank")
    @Schema(description = "Mật khẩu", example = "password123")
    private String password;
}