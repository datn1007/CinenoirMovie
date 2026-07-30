package com.movie_be.movie.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu xác thực OTP")
public class VerifyOtpRequest {
    @Email(message = "Email không hợp lệ")
    @Schema(description = "Email", example = "user@example.com")
    private String email;
    
    @NotBlank(message = "OTP không được để trống")
    @Size(min = 6, max = 6, message = "OTP phải có 6 ký tự")
    @Schema(description = "Mã OTP", example = "123456")
    private String otp;
}