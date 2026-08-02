package com.movie_be.movie.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.movie_be.movie.security.JwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173}")
    private String[] corsAllowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(corsAllowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public: auth flows, docs, error dispatch, uploaded assets
                        .requestMatchers("/api/auth/**").permitAll()
                        // PayOS server-to-server payment webhook — signature verified in the controller itself
                        .requestMatchers(HttpMethod.POST, "/api/payments/payos/webhook").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        // Public: QR code image referenced by URL from ticket confirmation emails
                        .requestMatchers(HttpMethod.GET, "/api/tickets/*/qr.png").permitAll()

                        // Public: read-only catalog browsing (movies, showtimes, rooms, seat maps)
                        .requestMatchers(HttpMethod.GET,
                                "/api/movies", "/api/movies/*",
                                "/api/schedules/**",
                                "/api/schedule-seats", "/api/showtimes/*/seats",
                                "/api/cinema-rooms", "/api/cinema-rooms/*", "/api/cinema-rooms/*/seats",
                                "/api/vouchers/validate", "/api/vouchers/active"
                        ).permitAll()

                        // Admin-only: catalog mutations, voucher/account/invoice administration, uploads
                        .requestMatchers(HttpMethod.POST,
                                "/api/movies", "/api/cinema-rooms", "/api/schedules", "/api/schedules/*/movies"
                        ).hasRole("Admin")
                        .requestMatchers(HttpMethod.PUT, "/api/movies/*", "/api/cinema-rooms/*", "/api/schedules/*").hasRole("Admin")
                        .requestMatchers(HttpMethod.DELETE, "/api/movies/*", "/api/cinema-rooms/*", "/api/schedules/*").hasRole("Admin")
                        .requestMatchers("/api/admin/vouchers/**").hasRole("Admin")
                        .requestMatchers("/api/upload/**").hasRole("Admin")
                        .requestMatchers(HttpMethod.GET, "/api/admin/accounts").hasRole("Admin")
                        .requestMatchers(HttpMethod.POST, "/api/admin/accounts").hasRole("Admin")
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/accounts/*").hasRole("Admin")
                        .requestMatchers(HttpMethod.GET, "/api/invoices").hasRole("Admin")
                        .requestMatchers(HttpMethod.POST, "/api/invoices").hasRole("Admin")
                        .requestMatchers(HttpMethod.PUT, "/api/invoices/*").hasRole("Admin")

                        // Staff counter operations (admin can also use them)
                        .requestMatchers("/api/ticket-selling/**", "/api/members/**").hasAnyRole("Employee", "Admin")
                        .requestMatchers(HttpMethod.POST, "/api/bookings/*/checkin").hasAnyRole("Employee", "Admin")

                        // Authenticated, self-or-admin ownership enforced inside the controller
                        .requestMatchers(HttpMethod.GET, "/api/admin/accounts/*").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/admin/accounts/*").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/invoices/*").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/invoices/*").authenticated()
                        .requestMatchers("/api/bookings/**").authenticated()

                        // Default: anything not explicitly listed above requires a valid login
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}
