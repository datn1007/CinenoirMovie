package com.movie_be.movie.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu đăng nhập bằng Google")
public class GoogleLoginRequest {
    @Schema(description = "Google ID token", example = "eyJhbGciOiJSUzI1NiIs...")
    private String idToken;
}