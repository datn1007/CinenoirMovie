package com.movie_be.movie.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import jakarta.validation.ValidationException;


import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "Yêu cầu đăng ký tài khoản")
public class RegisterRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 4, max = 20, message = "Tên đăng nhập phải từ 4 đến 20 ký tự")
    @Pattern(regexp = "^[a-zA-Z0-9._]+$", message = "Tên đăng nhập chỉ được chứa chữ, số, dấu chấm và gạch dưới")
    @Schema(description = "Tên đăng nhập", example = "user1")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Schema(description = "Mật khẩu", example = "password123")
    private String password;

    @NotBlank(message = "Email must not be blank")
    @Email(message = "Email is invalid")
    @Schema(description = "Email", example = "user@example.com")
    private String email;

    @NotBlank(message = "Full name must not be blank")
    @Pattern(regexp = "^[\\p{L}\\s.'-]+$", message = "Full name can only contain letters and spaces")
    @Schema(description = "Họ và tên", example = "Nguyen Van A")
    private String fullName;

    @NotBlank(message = "Phone number must not be blank")
    @Pattern(regexp = "^(\\+84|84|0)(3|5|7|8|9)[0-9]{8}$", message = "Số điện thoại không hợp lệ (định dạng Việt Nam, ví dụ 0912345678)")
    @Schema(description = "Số điện thoại", example = "0912345678")
    private String phone;

    @Schema(description = "Giới tính", example = "Nam")
    private String gender;

    @JsonProperty("birthDate")
    @Schema(description = "Ngày sinh", example = "2000-01-01")
    private String dateOfBirth;

    /**
     * Validate dateOfBirth: must be a valid yyyy-MM-dd date and not be after today.
     */
    public void validateDateOfBirth() {
        if (this.dateOfBirth == null || this.dateOfBirth.isBlank()) {
            throw new ValidationException("Ngày sinh không được để trống");
        }
        try {
            LocalDate dob = LocalDate.parse(this.dateOfBirth);
            if (dob.isAfter(LocalDate.now())) {
                throw new ValidationException("Đăng ký thất bại vì ngày sinh không được lớn hơn ngày hiện tại");
            }
        } catch (DateTimeParseException e) {
            throw new ValidationException("Ngày sinh không đúng định dạng (yyyy-MM-dd)");
        }
    }

    @Schema(description = "Địa chỉ", example = "Hà Nội")
    private String address;

    public void validatePasswordStrength() {
        com.movie_be.movie.util.PasswordValidator.validateStrength(this.password);
    }
}

