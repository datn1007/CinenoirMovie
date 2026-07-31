package com.movie_be.movie.service;

import com.movie_be.movie.dto.PayOSCheckoutRequest;
import com.movie_be.movie.dto.PayOSCheckoutResponse;
import com.movie_be.movie.dto.PayOSWebhookRequest;
import com.movie_be.movie.dto.PaymentStatusResponse;

public interface PayOSPaymentService {

    PayOSCheckoutResponse createCheckoutForBooking(PayOSCheckoutRequest request);

    boolean verifyWebhookSignature(PayOSWebhookRequest payload);

    void handleWebhook(PayOSWebhookRequest payload);

    PaymentStatusResponse getStatus(long orderCode);

    void cancelCheckout(long orderCode);

    void sweepExpiredPendingPayments();
}
