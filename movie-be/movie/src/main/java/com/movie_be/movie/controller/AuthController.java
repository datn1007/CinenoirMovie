package com.movie_be.movie.controller;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.movie_be.movie.dto.ForgotPasswordRequest;
import com.movie_be.movie.dto.GoogleLoginRequest;
import com.movie_be.movie.dto.LoginRequest;
import com.movie_be.movie.dto.RegisterRequest;
import com.movie_be.movie.dto.ResetPasswordRequest;
import com.movie_be.movie.dto.TokenResponse;
import com.movie_be.movie.dto.VerifyOtpRequest;
import com.movie_be.movie.entity.account.Account;
import com.movie_be.movie.entity.role.Role;
import com.movie_be.movie.repository.AccountRepository;
import com.movie_be.movie.repository.RoleRepository;
import com.movie_be.movie.security.JwtService;
import com.movie_be.movie.service.PasswordResetService;

import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AccountRepository userRepository;

    private final RoleRepository roleRepository;

    private final PasswordEncoder passwordEncoder;

    private final AuthenticationManager authenticationManager;

    private final JwtService jwtService;

    private final PasswordResetService passwordResetService;

    private final RestTemplate restTemplate;

    @PostMapping("/register")
    public ResponseEntity<String> register(
            @Valid @RequestBody RegisterRequest request) {

        // Extra validation for dateOfBirth (cannot be in the future)
        // Keep it before other logic; if invalid will throw and be caught by FE via 400.
        request.validateDateOfBirth();
        request.validatePasswordStrength();

        // Validate fullName pattern before persisting (avoid other validations masking DOB error)
        if (request.getFullName() == null || request.getFullName().isBlank()) {
            return ResponseEntity.badRequest().body("Họ và tên không được để trống");
        }

        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Tên đăng nhập đã tồn tại");
        }
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email đã được sử dụng");
        }

        Role role = roleRepository
                .findById(3L)
                .orElseThrow();

        Account account = new Account();

        long count = userRepository.count() + 1;
        String accountId = String.format("CN-%04d", count);

        account.setAccountId(accountId);
        account.setUsername(request.getUsername());
        account.setEmail(request.getEmail());
        account.setPassword(
                passwordEncoder.encode(
                        request.getPassword()));
        account.setFullName(request.getFullName());
        account.setPhone(request.getPhone());
        account.setGender(request.getGender());
        account.setDateOfBirth(request.getDateOfBirth());
        account.setAddress(request.getAddress());
        account.setStatus(1);
        account.setRole(role);

        try {
            userRepository.save(account);
        } catch (ConstraintViolationException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }

        return ResponseEntity.ok("Register Success");
    }



    @PostMapping("/login")
    public TokenResponse login(
            @Valid @RequestBody LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()));

        String token =
                jwtService.generateToken(
                        request.getUsername());

        Account account = userRepository
                .findByUsername(request.getUsername())
                .orElseThrow();

        TokenResponse response = new TokenResponse();
        response.setToken(token);
        response.setRoleId(account.getRole().getId());
        response.setRoleName(account.getRole().getRoleName());
        response.setAccountId(account.getAccountId());
        response.setUsername(account.getUsername());
        response.setFullName(account.getFullName());
        response.setEmail(account.getEmail());

        return response;
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            String idToken = request.getIdToken();
            
            // Verify Google token and get user info
            String googleTokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
            Map<String, Object> userInfo = restTemplate.getForObject(googleTokenInfoUrl, Map.class);
            
            if (userInfo == null) {
                return ResponseEntity.badRequest().body("Token Google không hợp lệ");
            }
            
            String email = (String) userInfo.get("email");
            String name = (String) userInfo.get("name");
            
            if (email == null) {
                return ResponseEntity.badRequest().body("Không thể lấy email từ tài khoản Google");
            }
            
            Account account = userRepository.findByEmail(email).orElseGet(() -> {
                Account newAccount = new Account();
                
                long count = userRepository.count() + 1;
                String accountId = String.format("CN-%04d", count);
                
                Role role = roleRepository.findById(3L).orElseThrow();
                
                newAccount.setAccountId(accountId);
                newAccount.setUsername(email);
                newAccount.setEmail(email);
                // Use a short random password instead of the full Google idToken (which can be >72 bytes)
                String randomPassword = UUID.randomUUID().toString();
                newAccount.setPassword(passwordEncoder.encode(randomPassword));
                newAccount.setFullName(name != null ? name : email);
                newAccount.setStatus(1);
                newAccount.setRole(role);
                
                return userRepository.save(newAccount);
            });
            
            String token = jwtService.generateToken(account.getUsername());

            TokenResponse response = new TokenResponse();
            response.setToken(token);
            response.setRoleId(account.getRole().getId());
            response.setRoleName(account.getRole().getRoleName());
            response.setAccountId(account.getAccountId());
            response.setUsername(account.getUsername());
            response.setFullName(account.getFullName());
            response.setEmail(account.getEmail());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Đăng nhập Google thất bại: " + e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            passwordResetService.sendOtp(request.getEmail());
            return ResponseEntity.ok("OTP đã được gửi đến email của bạn");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        boolean isValid = passwordResetService.verifyOtp(request.getEmail(), request.getOtp());
        if (isValid) {
            return ResponseEntity.ok("OTP hợp lệ");
        }
        return ResponseEntity.badRequest().body("OTP không hợp lệ hoặc đã hết hạn");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        request.validatePasswordStrength();

        boolean isValid = passwordResetService.verifyOtp(request.getEmail(), request.getOtp());
        if (!isValid) {
            return ResponseEntity.badRequest().body("OTP không hợp lệ hoặc đã hết hạn");
        }

        passwordResetService.resetPassword(request.getEmail(), request.getNewPassword());
        return ResponseEntity.ok("Mật khẩu đã được đặt lại thành công");
    }
}
