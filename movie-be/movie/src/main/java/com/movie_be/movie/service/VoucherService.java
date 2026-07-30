package com.movie_be.movie.service;

import com.movie_be.movie.dto.VoucherDTO;
import com.movie_be.movie.dto.VoucherValidateResponse;

import java.math.BigDecimal;
import java.util.List;

public interface VoucherService {
    List<VoucherDTO> getAll();

    /** Vouchers phù hợp để hiển thị công khai ở trang chủ: đang hoạt động, chưa hết hạn, còn lượt dùng. */
    List<VoucherDTO> getPublicActive();

    VoucherDTO getById(Long id);
    VoucherDTO create(VoucherDTO dto);
    VoucherDTO update(Long id, VoucherDTO dto);
    void softDelete(Long id);

    /** Kiểm tra mã voucher và trả về thông tin giảm giá (không thay đổi usedCount). */
    VoucherValidateResponse validate(String code, BigDecimal orderAmount);

    /**
     * Áp dụng voucher: kiểm tra hợp lệ, tăng usedCount.
     * @return số tiền được giảm, hoặc BigDecimal.ZERO nếu code null/blank.
     * @throws IllegalArgumentException nếu code không hợp lệ.
     */
    BigDecimal applyVoucher(String code, BigDecimal orderAmount);
}
