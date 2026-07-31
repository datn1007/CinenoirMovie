package com.movie_be.movie.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

/** Mirrors PayOS's webhook envelope. `data` is kept as a raw Map so the alphabetical-key
 *  signature verification can be recomputed exactly as PayOS computed it. */
@Getter
@Setter
@NoArgsConstructor
public class PayOSWebhookRequest {
    private String code;
    private String desc;
    private boolean success;
    private Map<String, Object> data;
    private String signature;
}
