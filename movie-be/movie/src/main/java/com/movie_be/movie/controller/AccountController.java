package com.movie_be.movie.controller;

import com.movie_be.movie.dto.AccountDTO;
import com.movie_be.movie.dto.CreateAccountRequest;
import com.movie_be.movie.dto.UpdateAccountRequest;
import com.movie_be.movie.security.AuthorizationUtils;
import com.movie_be.movie.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<List<AccountDTO>> getAllAccounts() {
        return ResponseEntity.ok(accountService.getAllAccounts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAccountById(@PathVariable String id, Authentication authentication) {
        AccountDTO account = accountService.getAccountById(id);
        if (!isSelfOrAdmin(account, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(account);
    }

    @PostMapping
    public ResponseEntity<?> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        try {
            request.validatePasswordStrength();
            return ResponseEntity.status(HttpStatus.CREATED).body(accountService.createAccount(request));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAccount(
            @PathVariable String id,
            @Valid @RequestBody UpdateAccountRequest request,
            Authentication authentication) {
        try {
            AccountDTO existing = accountService.getAccountById(id);
            if (!isSelfOrAdmin(existing, authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            if (!AuthorizationUtils.isAdmin(authentication)) {
                // Self-service profile edit: never let a non-admin change their own role/status.
                request.setRoleId(null);
                request.setStatus(null);
            }
            return ResponseEntity.ok(accountService.updateAccount(id, request));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    private boolean isSelfOrAdmin(AccountDTO account, Authentication authentication) {
        return AuthorizationUtils.isAdmin(authentication)
                || (authentication != null && authentication.getName().equals(account.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAccount(@PathVariable String id) {
        try {
            accountService.deleteAccount(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }


}
