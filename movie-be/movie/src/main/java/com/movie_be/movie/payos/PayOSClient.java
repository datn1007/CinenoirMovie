package com.movie_be.movie.payos;

import com.movie_be.movie.payos.dto.PayOSCreatePaymentRequest;
import com.movie_be.movie.payos.dto.PayOSCreatePaymentResponse;
import com.movie_be.movie.payos.dto.PayOSPaymentLinkInfoResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class PayOSClient {

    private static final String BASE_URL = "https://api-merchant.payos.vn";

    private final RestTemplate restTemplate;

    @Value("${payos.client-id:}")
    private String clientId;

    @Value("${payos.api-key:}")
    private String apiKey;

    @Value("${payos.checksum-key:}")
    private String checksumKey;

    public PayOSClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String getChecksumKey() {
        return checksumKey;
    }

    private void requireCredentials() {
        if (clientId == null || clientId.isBlank() || apiKey == null || apiKey.isBlank()
                || checksumKey == null || checksumKey.isBlank()) {
            throw new IllegalStateException(
                    "PayOS credentials are not configured (PAYOS_CLIENT_ID/PAYOS_API_KEY/PAYOS_CHECKSUM_KEY).");
        }
    }

    public PayOSCreatePaymentResponse.Data createPaymentLink(PayOSCreatePaymentRequest req) {
        requireCredentials();
        req.setSignature(PayOSSignatureUtil.signCreatePaymentRequest(
                checksumKey, req.getAmount(), req.getCancelUrl(), req.getDescription(), req.getOrderCode(), req.getReturnUrl()));

        HttpEntity<PayOSCreatePaymentRequest> entity = new HttpEntity<>(req, buildHeaders());
        ResponseEntity<PayOSCreatePaymentResponse> resp = restTemplate.exchange(
                BASE_URL + "/v2/payment-requests", HttpMethod.POST, entity, PayOSCreatePaymentResponse.class);

        PayOSCreatePaymentResponse body = resp.getBody();
        if (body == null || body.getData() == null || !"00".equals(body.getCode())) {
            throw new IllegalStateException(
                    "PayOS create-payment-link failed: " + (body != null ? body.getDesc() : "empty response"));
        }
        return body.getData();
    }

    public PayOSPaymentLinkInfoResponse.Data getPaymentLinkInfo(long orderCode) {
        requireCredentials();
        HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
        ResponseEntity<PayOSPaymentLinkInfoResponse> resp = restTemplate.exchange(
                BASE_URL + "/v2/payment-requests/" + orderCode, HttpMethod.GET, entity, PayOSPaymentLinkInfoResponse.class);

        PayOSPaymentLinkInfoResponse body = resp.getBody();
        if (body == null || body.getData() == null) {
            throw new IllegalStateException("PayOS get-payment-link-info returned empty response for orderCode " + orderCode);
        }
        return body.getData();
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-client-id", clientId);
        headers.set("x-api-key", apiKey);
        return headers;
    }
}
