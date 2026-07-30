package com.movie_be.movie.dto;

import jakarta.validation.constraints.Email;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateAccountRequest {

    private String fullName;

    @Email(message = "Email không hợp lệ")
    private String email;

    private String phone;
    private String gender;
    private String dateOfBirth;
    private String address;
    private Integer status;
    private Long roleId;
}
