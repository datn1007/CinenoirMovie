package com.movie_be.movie.controller;

import com.movie_be.movie.dto.VoucherDTO;
import com.movie_be.movie.dto.VoucherValidateResponse;
import com.movie_be.movie.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    // ─── Admin CRUD (/api/admin/vouchers) ─────────────────────────────────────

    @GetMapping("/api/admin/vouchers")
    public ResponseEntity<List<VoucherDTO>> getAll() {
        return ResponseEntity.ok(voucherService.getAll());
    }

    @GetMapping("/api/admin/vouchers/{id}")
    public ResponseEntity<VoucherDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(voucherService.getById(id));
    }

    @PostMapping("/api/admin/vouchers")
    public ResponseEntity<?> create(@RequestBody VoucherDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(voucherService.create(dto));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/api/admin/vouchers/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody VoucherDTO dto) {
        try {
            return ResponseEntity.ok(voucherService.update(id, dto));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @DeleteMapping("/api/admin/vouchers/{id}")
    public ResponseEntity<?> softDelete(@PathVariable Long id) {
        try {
            voucherService.softDelete(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    // ─── Public browsing (/api/vouchers/active) ───────────────────────────────

    @GetMapping("/api/vouchers/active")
    public ResponseEntity<List<VoucherDTO>> getActive() {
        return ResponseEntity.ok(voucherService.getPublicActive());
    }

    // ─── Public validate (/api/vouchers/validate) ─────────────────────────────

    @GetMapping("/api/vouchers/validate")
    public ResponseEntity<VoucherValidateResponse> validate(
            @RequestParam String code,
            @RequestParam(defaultValue = "0") BigDecimal amount) {
        VoucherValidateResponse result = voucherService.validate(code, amount);
        return ResponseEntity.ok(result);
    }
}
