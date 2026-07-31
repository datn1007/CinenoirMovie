package com.movie_be.movie.payos.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PayOSPaymentLinkInfoResponse {
    private String code;
    private String desc;
    private Data data;

    @Getter
    @Setter
    public static class Data {
        private long orderCode;
        private String status; // "PAID" | "CANCELLED" | "EXPIRED" | "PENDING" | ...
        private long amount;
    }
}
