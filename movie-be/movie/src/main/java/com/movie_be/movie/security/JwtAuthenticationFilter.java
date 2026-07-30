package com.movie_be.movie.security;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader =
                request.getHeader("Authorization");

        if (authHeader == null
                || !authHeader.startsWith("Bearer ")) {

            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        // ── CODE CŨ (không có try-catch, token lỗi sẽ bắn JwtException →
        //    Spring Boot forward tới /error → /error không được permitAll() → 403) ──
        //
        // String username = jwtService.extractUsername(token);
        //
        // if (username != null
        //         && SecurityContextHolder.getContext()
        //         .getAuthentication() == null) {
        //
        //     UserDetails userDetails =
        //             userDetailsService
        //                     .loadUserByUsername(username);
        //
        //     UsernamePasswordAuthenticationToken authToken =
        //             new UsernamePasswordAuthenticationToken(
        //                     userDetails,
        //                     null,
        //                     userDetails.getAuthorities());
        //
        //     authToken.setDetails(
        //             new WebAuthenticationDetailsSource()
        //                     .buildDetails(request));
        //
        //     SecurityContextHolder.getContext()
        //             .setAuthentication(authToken);
        // }
        //
        // filterChain.doFilter(request, response);
        // ── HẾT CODE CŨ ──

        // ── CODE MỚI: wrap JWT parsing trong try-catch ──
        // Khi token không hợp lệ (hết hạn, sai chữ ký, rỗng...) thì bỏ qua
        // thay vì bắn exception làm gãy filter chain và gây 403 sai.
        try {
            String username = jwtService.extractUsername(token);

            if (username != null
                    && SecurityContextHolder.getContext()
                    .getAuthentication() == null) {

                UserDetails userDetails =
                        userDetailsService
                                .loadUserByUsername(username);

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities());

                authToken.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request));

                SecurityContextHolder.getContext()
                        .setAuthentication(authToken);
            }
        } catch (Exception ignored) {
            // Token không hợp lệ — không set authentication,
            // để Spring Security tự trả 403 cho endpoint được bảo vệ.
        }

        filterChain.doFilter(request, response);
    }
}