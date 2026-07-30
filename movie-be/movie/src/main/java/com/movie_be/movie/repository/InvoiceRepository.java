package com.movie_be.movie.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.movie_be.movie.entity.invoice.Invoice;

public interface InvoiceRepository extends JpaRepository<Invoice, String> {

    @Query("SELECT i.invoiceId FROM Invoice i")
    List<String> findAllIds();

    List<Invoice> findByInvoiceIdContainingIgnoreCase(String invoiceId);

    List<Invoice> findByAccount_AccountId(String accountId);

    List<Invoice> findByAccount_AccountIdAndStatus(String accountId, Short status);

    @Query("SELECT i FROM Invoice i LEFT JOIN FETCH i.account a WHERE a.phone LIKE %:phone%")
    List<Invoice> findByAccountPhoneContaining(@Param("phone") String phone);

    @Query("""
        SELECT i FROM Invoice i
        WHERE i.account.accountId = :accountId
          AND i.addScore IS NOT NULL
          AND i.addScore > 0
          AND i.bookingDate >= :fromDate
          AND i.bookingDate <= :toDate
        ORDER BY i.bookingDate DESC
    """)
    List<Invoice> findScoreAddingHistoryByAccountId(
            @Param("accountId") String accountId,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate
    );

    @Query("""
        SELECT i FROM Invoice i
        WHERE i.account.accountId = :accountId
          AND i.useScore IS NOT NULL
          AND i.useScore > 0
          AND i.bookingDate >= :fromDate
          AND i.bookingDate <= :toDate
        ORDER BY i.bookingDate DESC
    """)
    List<Invoice> findScoreUsingHistoryByAccountId(
            @Param("accountId") String accountId,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate
    );
}
