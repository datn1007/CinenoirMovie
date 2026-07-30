package com.movie_be.movie.service;

import com.movie_be.movie.dto.TicketSellingRequest;
import com.movie_be.movie.dto.TicketSellingResponse;

public interface TicketSellingService {

    TicketSellingResponse sellTicket(TicketSellingRequest request);
}