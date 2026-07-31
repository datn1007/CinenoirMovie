package com.movie_be.movie.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class PayOSCheckoutResponse {
    private String invoiceId;
    private long orderCode;
    private String checkoutUrl;
    private String qrCode;
}
