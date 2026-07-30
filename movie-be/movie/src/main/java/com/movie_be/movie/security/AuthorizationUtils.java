package com.movie_be.movie.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public final class AuthorizationUtils {

    private AuthorizationUtils() {
    }

    public static boolean hasRole(Authentication authentication, String role) {
        return authentication != null
                && authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_" + role));
    }

    public static boolean isAdmin(Authentication authentication) {
        return hasRole(authentication, "Admin");
    }
}
