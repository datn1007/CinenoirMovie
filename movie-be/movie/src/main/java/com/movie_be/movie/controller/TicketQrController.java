package com.movie_be.movie.controller;

import com.movie_be.movie.repository.InvoiceRepository;
import com.movie_be.movie.util.QrCodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class TicketQrController {

    private final InvoiceRepository invoiceRepository;

    /**
     * Public — referenced as a plain https:// image URL from ticket confirmation emails.
     * Gmail (and most other clients) strip embedded base64 <img> data from HTML email as an
     * anti-abuse measure, but render normal externally-hosted image URLs fine.
     */
    @GetMapping("/api/tickets/{invoiceId}/qr.png")
    public ResponseEntity<byte[]> qrCode(@PathVariable String invoiceId) {
        if (!invoiceRepository.existsById(invoiceId)) {
            return ResponseEntity.notFound().build();
        }
        try {
            byte[] png = QrCodeGenerator.generatePng(invoiceId, 220);
            return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(png);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
