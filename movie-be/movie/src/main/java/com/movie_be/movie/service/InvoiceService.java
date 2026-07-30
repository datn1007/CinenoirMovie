package com.movie_be.movie.service;

import com.movie_be.movie.dto.InvoiceDTO;
import org.springframework.lang.NonNull;

public interface InvoiceService {

    InvoiceDTO create(InvoiceDTO dto);

    /** update partial: chỉ cập nhật các field trong dto KHÁC null */
    InvoiceDTO updatePartial(@NonNull String invoiceId, InvoiceDTO dto);

    InvoiceDTO getById(@NonNull String invoiceId);

    java.util.List<InvoiceDTO> getAll();

    void delete(@NonNull String invoiceId);
}


