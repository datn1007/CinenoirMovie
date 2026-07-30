package com.movie_be.movie.util;

import jakarta.validation.ValidationException;

/**
 * Same bar as the frontend's password-strength meter: at least 8 characters
 * and at least 3 of the 4 character classes (lower/upper/digit/special).
 */
public final class PasswordValidator {

    private PasswordValidator() {
    }

    public static void validateStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new ValidationException("Mật khẩu phải có ít nhất 8 ký tự");
        }
        int categories = 0;
        if (password.chars().anyMatch(Character::isLowerCase)) categories++;
        if (password.chars().anyMatch(Character::isUpperCase)) categories++;
        if (password.chars().anyMatch(Character::isDigit)) categories++;
        if (password.chars().anyMatch(c -> !Character.isLetterOrDigit(c))) categories++;
        if (categories < 3) {
            throw new ValidationException("Mật khẩu chưa đủ mạnh: cần ít nhất 3 trong 4 loại ký tự (chữ hoa, chữ thường, số, ký tự đặc biệt)");
        }
    }
}
