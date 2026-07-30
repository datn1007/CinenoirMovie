package com.movie_be.movie.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateAccountRequest {

    @NotBlank(message = "Username không được để trống")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;

    private String fullName;

    @Email(message = "Email không hợp lệ")
    private String email;

    private String phone;
    private String gender;
    private String dateOfBirth;
    private String address;
    private Integer status;
    private Long roleId;

    public void validatePasswordStrength() {
        com.movie_be.movie.util.PasswordValidator.validateStrength(this.password);
    }
}
