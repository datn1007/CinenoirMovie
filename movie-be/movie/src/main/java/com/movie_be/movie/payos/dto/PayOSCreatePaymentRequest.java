package com.movie_be.movie.payos.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class PayOSCreatePaymentRequest {
    private long orderCode;
    private long amount;
    private String description;
    private String cancelUrl;
    private String returnUrl;
    private String signature;
    private Long expiredAt;      // optional, unix seconds
    private String buyerEmail;   // optional
    private List<Item> items;    // optional

    @Getter
    @Setter
    public static class Item {
        private String name;
        private int quantity;
        private long price;

        public Item() {}

        public Item(String name, int quantity, long price) {
            this.name = name;
            this.quantity = quantity;
            this.price = price;
        }
    }
}
