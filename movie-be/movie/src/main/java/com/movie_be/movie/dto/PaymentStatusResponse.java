package com.movie_be.movie.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@AllArgsConstructor
public class PaymentStatusResponse {
    private String invoiceId;
    private long orderCode;
    /** PENDING | PAID | CANCELLED | FAILED */
    private String paymentStatus;
    /** Legacy Invoice.status (null | 1 | 2 | 3), for FE convenience */
    private Short status;
    private BigDecimal amount;
}
