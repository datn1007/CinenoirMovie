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
@Schema(description = "Yêu cầu đặt lại mật khẩu")
public class ResetPasswordRequest {
    @Email(message = "Email không hợp lệ")
    @Schema(description = "Email", example = "user@example.com")
    private String email;
    
    @NotBlank(message = "OTP không được để trống")
    @Size(min = 6, max = 6, message = "OTP phải có 6 ký tự")
    @Schema(description = "Mã OTP", example = "123456")
    private String otp;
    
    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Schema(description = "Mật khẩu mới", example = "newpassword123")
    private String newPassword;

    public void validatePasswordStrength() {
        com.movie_be.movie.util.PasswordValidator.validateStrength(this.newPassword);
    }
}