package com.movie_be.movie.controller;

import com.movie_be.movie.dto.InvoiceDTO;
import com.movie_be.movie.security.AuthorizationUtils;
import com.movie_be.movie.service.AccountService;
import com.movie_be.movie.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final AccountService accountService;

    @PostMapping
    public ResponseEntity<InvoiceDTO> createInvoice(@RequestBody InvoiceDTO dto) {
        InvoiceDTO created = invoiceService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InvoiceDTO> updateInvoicePartial(
            @PathVariable String id,
            @RequestBody InvoiceDTO dto
    ) {
        InvoiceDTO updated = invoiceService.updatePartial(id, dto);
        return ResponseEntity.ok(updated);
    }


    @GetMapping
    public java.util.List<InvoiceDTO> getAllInvoices() {
        return invoiceService.getAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getInvoiceById(@PathVariable String id, Authentication authentication) {
        InvoiceDTO invoice = invoiceService.getById(id);
        if (!isOwnerOrAdmin(invoice, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(invoice);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteInvoice(@PathVariable String id, Authentication authentication) {
        InvoiceDTO invoice = invoiceService.getById(id);
        if (!isOwnerOrAdmin(invoice, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        invoiceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private boolean isOwnerOrAdmin(InvoiceDTO invoice, Authentication authentication) {
        if (AuthorizationUtils.isAdmin(authentication)) return true;
        if (invoice.getAccountId() == null || authentication == null) return false;
        try {
            return invoice.getAccountId().equals(accountService.getAccountByUsername(authentication.getName()).getAccountId());
        } catch (RuntimeException ex) {
            return false;
        }
    }
}

