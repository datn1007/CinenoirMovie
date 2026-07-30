package com.movie_be.movie.config;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import com.fasterxml.jackson.core.JsonParseException;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Global exception handler to ensure REST APIs always return JSON (not HTML/stacktrace)
 * when FE submits invalid data during demo.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        Map<String, Object> body = baseBody(ex.getMessage(), HttpStatus.BAD_REQUEST, request);

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            // keep first message per field
            fieldErrors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        body.put("fieldErrors", fieldErrors);

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler({
            IllegalArgumentException.class,
            jakarta.validation.ConstraintViolationException.class,
            jakarta.validation.ValidationException.class
    })
    public ResponseEntity<Object> handleBadRequest(RuntimeException ex, HttpServletRequest request) {
        return new ResponseEntity<>(baseBody(ex.getMessage(), HttpStatus.BAD_REQUEST, request), HttpStatus.BAD_REQUEST);
    }

    // Phải khai báo trước handler AuthenticationException chung bên dưới — Spring chọn handler
    // cụ thể nhất theo kiểu exception, nên DisabledException (tài khoản bị vô hiệu hóa) sẽ được
    // xử lý riêng thay vì rơi vào thông báo "sai tên đăng nhập/mật khẩu" chung.
    @ExceptionHandler(org.springframework.security.authentication.DisabledException.class)
    public ResponseEntity<Object> handleDisabledAccount(org.springframework.security.authentication.DisabledException ex, HttpServletRequest request) {
        Map<String, Object> body = baseBody("Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ admin để được hỗ trợ.", HttpStatus.FORBIDDEN, request);
        body.put("errorCode", "ACCOUNT_DISABLED");
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<Object> handleAuthentication(org.springframework.security.core.AuthenticationException ex, HttpServletRequest request) {
        Map<String, Object> body = baseBody("Tên đăng nhập hoặc mật khẩu không đúng", HttpStatus.UNAUTHORIZED, request);
        return new ResponseEntity<>(body, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Object> handleNotReadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        String message = "Invalid request body";
        Throwable cause = ex.getCause();
        if (cause instanceof JsonParseException || (cause != null && cause.getMessage() != null)) {
            message = cause != null && cause.getMessage() != null ? cause.getMessage() : message;
        }
        Map<String, Object> body = baseBody(message, HttpStatus.BAD_REQUEST, request);
        body.put("errorCode", "INVALID_JSON");
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Object> handleRuntime(RuntimeException ex, HttpServletRequest request) {
        // Avoid leaking internal stacktrace to FE; return clean JSON.
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        String msg = ex.getMessage() != null ? ex.getMessage() : "Unexpected error";

        // Heuristic: treat "not found" as 404 if message suggests it.
        if (msg.toLowerCase().contains("not found")) {
            status = HttpStatus.NOT_FOUND;
        }

        Map<String, Object> body = baseBody(msg, status, request);
        return new ResponseEntity<>(body, status);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleAny(Exception ex, HttpServletRequest request) {
        Map<String, Object> body = baseBody("Unexpected error", HttpStatus.INTERNAL_SERVER_ERROR, request);
        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private Map<String, Object> baseBody(String message, HttpStatus status, HttpServletRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message != null && !message.isBlank() ? message : status.getReasonPhrase());
        body.put("path", request != null ? request.getRequestURI() : null);
        return body;
    }
}

