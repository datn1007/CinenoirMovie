package com.movie_be.movie.payos.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PayOSCreatePaymentResponse {
    private String code;
    private String desc;
    private Data data;
    private String signature;

    @Getter
    @Setter
    public static class Data {
        private String checkoutUrl;
        private String paymentLinkId;
        private String qrCode;
        private String status;
        private long orderCode;
        private long amount;
    }
}
