package com.movie_be.movie.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.movie_be.movie.entity.account.Account;
import com.movie_be.movie.repository.AccountRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final AccountRepository accountRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private final Map<String, OtpEntry> otpStorage = new ConcurrentHashMap<>();

    private static final int OTP_EXPIRY_MINUTES = 5;

    public void sendOtp(String email) {
        Optional<Account> accountOpt = accountRepository.findByEmail(email);
        if (accountOpt.isEmpty()) {
            throw new RuntimeException("Email không tồn tại trong hệ thống");
        }

        String otp = generateOtp();
        otpStorage.put(email, new OtpEntry(otp, LocalDateTime.now()));

        // Log OTP to console as fallback (so user can still see it even if SMTP fails)
        log.info("============================================");
        log.info("OTP for {}: {}", email, otp);
        log.info("OTP expires in {} minutes", OTP_EXPIRY_MINUTES);
        log.info("============================================");

        try {
            String name = accountOpt.get().getFullName() != null && !accountOpt.get().getFullName().isBlank()
                    ? accountOpt.get().getFullName()
                    : "bạn";

            // Use non-breaking spaces to guarantee it won't wrap on mobile clients
            String spacedOtp = otp.chars().mapToObj(c -> String.valueOf((char) c)).collect(java.util.stream.Collectors.joining("&nbsp;&nbsp;&nbsp;"));

            String html = "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#141414;color:#ffffff;padding:0;\">"
                    + "<div style=\"text-align:center;padding:24px 0;border-bottom:1px solid #333;\">"
                    + "<h1 style=\"margin:0;color:#e50914;font-size:28px;letter-spacing:2px;font-weight:900;\">CINENOIR</h1>"
                    + "</div>"
                    + "<div style=\"padding:32px 24px;\">"
                    + "<h2 style=\"margin:0 0 24px;text-align:center;font-size:20px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;\">ĐẶT LẠI MẬT KHẨU</h2>"
                    + "<div style=\"border:1px solid #e50914;border-radius:8px;padding:24px;text-align:center;margin-bottom:32px;background:rgba(229,9,20,0.05);\">"
                    + "<div style=\"font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;\">Mã OTP của bạn</div>"
                    + "<div style=\"font-size:38px;font-weight:bold;letter-spacing:2px;color:#ffffff;white-space:nowrap;\">" + spacedOtp + "</div>"
                    + "</div>"
                    + "<p style=\"font-size:16px;line-height:1.5;margin-bottom:16px;color:#ddd;\">Xin chào <strong>" + name + "</strong>,</p>"
                    + "<p style=\"font-size:15px;line-height:1.6;color:#bbb;margin-bottom:24px;\">"
                    + "Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản CineNoir của bạn. Vui lòng sử dụng mã OTP phía trên để xác minh danh tính."
                    + "</p>"
                    + "<div style=\"background:#2a0a0a;border:1px solid #4a1111;border-radius:6px;padding:16px;margin-bottom:32px;display:flex;align-items:center;justify-content:center;text-align:center;\">"
                    + "<span style=\"font-size:14px;color:#ff4444;\">⏰ Có hiệu lực trong <strong style=\"color:#ff4444;\">" + OTP_EXPIRY_MINUTES + " phút</strong>.</span>"
                    + "</div>"
                    + "<div style=\"margin-bottom:32px;\">"
                    + "<div style=\"font-weight:bold;font-size:15px;margin-bottom:8px;color:#e9c349;\">🔒 Vì lý do bảo mật</div>"
                    + "<div style=\"font-size:14px;color:#888;line-height:1.5;\">"
                    + "Không chia sẻ mã OTP này. Nếu bạn không yêu cầu, vui lòng bỏ qua email này."
                    + "</div>"
                    + "</div>"
                    + "<p style=\"font-size:15px;color:#bbb;line-height:1.6;margin:0;\">"
                    + "Trân trọng,<br>"
                    + "<strong style=\"color:#fff;\">Đội ngũ CineNoir</strong>"
                    + "</p>"
                    + "</div>"
                    + "<div style=\"background:#0a0a0a;padding:24px;text-align:center;border-top:1px solid #333;\">"
                    + "<div style=\"font-size:12px;color:#666;margin-bottom:8px;\">© 2026 CineNoir. All Rights Reserved.</div>"
                    + "<a href=\"mailto:support@cinenoir.com\" style=\"color:#e50914;text-decoration:none;font-size:13px;font-weight:bold;\">support@cinenoir.com</a>"
                    + "</div>"
                    + "</div>";

            emailService.sendHtmlEmail(email, "Mã OTP đặt lại mật khẩu - CineNoir", html);
            log.info("OTP email sent successfully to {}", email);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}. OTP is generated but email sending failed.", email, e);
            throw new RuntimeException("Gửi OTP thất bại. Vui lòng kiểm tra cấu hình email và thử lại.");
        }
    }

    public boolean verifyOtp(String email, String otp) {
        OtpEntry entry = otpStorage.get(email);
        if (entry == null) {
            return false;
        }

        if (entry.getCreatedAt().plusMinutes(OTP_EXPIRY_MINUTES).isBefore(LocalDateTime.now())) {
            otpStorage.remove(email);
            return false;
        }

        return entry.getOtp().equals(otp);
    }

    public void resetPassword(String email, String newPassword) {
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại"));

        account.setPassword(passwordEncoder.encode(newPassword));
        accountRepository.save(account);

        otpStorage.remove(email);
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            otp.append(random.nextInt(10));
        }
        return otp.toString();
    }

    private static class OtpEntry {
        private final String otp;
        private final LocalDateTime createdAt;

        public OtpEntry(String otp, LocalDateTime createdAt) {
            this.otp = otp;
            this.createdAt = createdAt;
        }

        public String getOtp() {
            return otp;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }
    }
}