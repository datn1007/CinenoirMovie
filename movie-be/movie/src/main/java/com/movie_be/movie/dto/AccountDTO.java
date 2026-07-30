package com.movie_be.movie.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AccountDTO {
    private String accountId;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String gender;
    private String dateOfBirth;
    private String identityCard;
    private String address;
    private Integer status;
    private Long roleId;
    private String roleName;
}
