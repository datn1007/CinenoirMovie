package com.movie_be.movie.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "Phản hồi token đăng nhập")
public class TokenResponse {
    @Schema(description = "JWT token", example = "eyJhbGciOiJIUzI1NiJ9...")
    private String token;

    @Schema(description = "ID vai trò", example = "1")
    private Long roleId;

    @Schema(description = "Tên vai trò", example = "Admin")
    private String roleName;

    @Schema(description = "Account ID", example = "CN-0001")
    private String accountId;

    @Schema(description = "Tên đăng nhập", example = "tuiday")
    private String username;

    @Schema(description = "Họ và tên", example = "Nguyen Van A")
    private String fullName;

    @Schema(description = "Email", example = "user@example.com")
    private String email;
}