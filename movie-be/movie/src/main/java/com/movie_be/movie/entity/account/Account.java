package com.movie_be.movie.entity.account;

import com.movie_be.movie.entity.role.Role;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "account")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Account {

    @Id
    @Column(name = "account_id")
    private String accountId;

    private String username;

    private String password;

    @Column(name = "full_name")
    private String fullName;

    @Email(message = "Email không hợp lệ")
    private String email;

    @Column(name = "phone_number")
    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Số điện thoại không hợp lệ")
    private String phone;

    @Column(name = "gender")
    private String gender;

    @Column(name = "date_of_birth")
    private String dateOfBirth;


    @Column(name = "identity_card")
    private String identityCard;

    @Column(name = "address")
    private String address;

    private Integer status;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;
}