package com.movie_be.movie.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Sends transactional email via Brevo's HTTPS API instead of raw SMTP — Render's free tier
 * blocks outbound connections on SMTP ports (587/465/25), so JavaMailSender/Gmail SMTP just
 * times out there. Brevo's API runs over HTTPS (443), which isn't blocked.
 */
@Service
public class EmailService {

    private static final String BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

    private final RestTemplate restTemplate;

    @Value("${brevo.api-key:}")
    private String apiKey;

    @Value("${brevo.sender-email:}")
    private String senderEmail;

    @Value("${brevo.sender-name:CineNoir}")
    private String senderName;

    public EmailService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public void sendHtmlEmail(String to, String subject, String htmlBody) {
        if (apiKey == null || apiKey.isBlank() || senderEmail == null || senderEmail.isBlank()) {
            throw new IllegalStateException(
                    "Brevo email credentials are not configured (BREVO_API_KEY/BREVO_SENDER_EMAIL).");
        }

        Map<String, Object> body = new HashMap<>();
        body.put("sender", Map.of("email", senderEmail, "name", senderName));
        body.put("to", List.of(Map.of("email", to)));
        body.put("subject", subject);
        body.put("htmlContent", htmlBody);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey);
        headers.set("Accept", "application/json");

        restTemplate.postForEntity(BREVO_ENDPOINT, new HttpEntity<>(body, headers), String.class);
    }
}
