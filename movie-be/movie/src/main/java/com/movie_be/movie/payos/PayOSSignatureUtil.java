package com.movie_be.movie.payos;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.Collectors;

public final class PayOSSignatureUtil {

    private PayOSSignatureUtil() {}

    public static String hmacSha256Hex(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : raw) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute PayOS HMAC signature", e);
        }
    }

    /** Fixed field order per PayOS's create-payment-request spec — NOT alphabetical. */
    public static String signCreatePaymentRequest(String checksumKey, long amount, String cancelUrl,
                                                   String description, long orderCode, String returnUrl) {
        String data = "amount=" + amount + "&cancelUrl=" + cancelUrl + "&description=" + description
                + "&orderCode=" + orderCode + "&returnUrl=" + returnUrl;
        return hmacSha256Hex(data, checksumKey);
    }

    /** Generic object signing used to verify webhook payloads: sort the data object's own keys alphabetically. */
    public static String signDataObject(String checksumKey, Map<String, Object> data) {
        String queryString = data.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + (e.getValue() == null ? "" : String.valueOf(e.getValue())))
                .collect(Collectors.joining("&"));
        return hmacSha256Hex(queryString, checksumKey);
    }
}
