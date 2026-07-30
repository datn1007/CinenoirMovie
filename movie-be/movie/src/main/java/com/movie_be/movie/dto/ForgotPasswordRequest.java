package com.movie_be.movie.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu quên mật khẩu")
public class ForgotPasswordRequest {
    @Email(message = "Email không hợp lệ")
    @Schema(description = "Email đã đăng ký", example = "user@example.com")
    private String email;
}