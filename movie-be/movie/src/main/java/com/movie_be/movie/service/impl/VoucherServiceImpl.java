package com.movie_be.movie.service.impl;

import com.movie_be.movie.dto.VoucherDTO;
import com.movie_be.movie.dto.VoucherValidateResponse;
import com.movie_be.movie.entity.voucher.Voucher;
import com.movie_be.movie.repository.VoucherRepository;
import com.movie_be.movie.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements VoucherService {

    private final VoucherRepository voucherRepository;

    @Override
    public List<VoucherDTO> getAll() {
        return voucherRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<VoucherDTO> getPublicActive() {
        LocalDate today = LocalDate.now();
        return voucherRepository.findAll().stream()
                .filter(v -> v.getStatus() != null && v.getStatus() == 1)
                .filter(v -> v.getValidFrom() == null || !today.isBefore(v.getValidFrom()))
                .filter(v -> v.getValidTo() == null || !today.isAfter(v.getValidTo()))
                .filter(v -> v.getMaxUses() == null || v.getUsedCount() == null || v.getUsedCount() < v.getMaxUses())
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public VoucherDTO getById(Long id) {
        return toDTO(findOrThrow(id));
    }

    @Override
    public VoucherDTO create(VoucherDTO dto) {
        String code = dto.getCode() == null ? "" : dto.getCode().trim().toUpperCase();
        if (code.isBlank()) throw new IllegalArgumentException("Mã voucher không được để trống");
        if (voucherRepository.existsByCodeIgnoreCase(code))
            throw new IllegalArgumentException("Mã voucher '" + code + "' đã tồn tại");

        Voucher v = new Voucher();
        v.setCode(code);
        fillFromDTO(v, dto);
        return toDTO(voucherRepository.save(v));
    }

    @Override
    public VoucherDTO update(Long id, VoucherDTO dto) {
        Voucher v = findOrThrow(id);
        fillFromDTO(v, dto);
        return toDTO(voucherRepository.save(v));
    }

    @Override
    public void softDelete(Long id) {
        Voucher v = findOrThrow(id);
        v.setStatus(0);
        voucherRepository.save(v);
    }

    @Override
    public VoucherValidateResponse validate(String code, BigDecimal orderAmount) {
        VoucherValidateResponse resp = new VoucherValidateResponse();
        if (code == null || code.isBlank()) {
            resp.setValid(false);
            resp.setMessage("Vui lòng nhập mã giảm giá");
            return resp;
        }

        Voucher v = voucherRepository.findByCodeIgnoreCase(code.trim()).orElse(null);
        if (v == null) {
            resp.setValid(false);
            resp.setMessage("Mã giảm giá không tồn tại");
            return resp;
        }
        if (v.getStatus() == null || v.getStatus() == 0) {
            resp.setValid(false);
            resp.setMessage("Mã giảm giá đã bị vô hiệu hoá");
            return resp;
        }

        LocalDate today = LocalDate.now();
        if (v.getValidFrom() != null && today.isBefore(v.getValidFrom())) {
            resp.setValid(false);
            resp.setMessage("Mã giảm giá chưa đến thời gian sử dụng");
            return resp;
        }
        if (v.getValidTo() != null && today.isAfter(v.getValidTo())) {
            resp.setValid(false);
            resp.setMessage("Mã giảm giá đã hết hạn");
            return resp;
        }
        if (v.getMaxUses() != null && v.getUsedCount() != null && v.getUsedCount() >= v.getMaxUses()) {
            resp.setValid(false);
            resp.setMessage("Mã giảm giá đã hết lượt sử dụng");
            return resp;
        }
        if (v.getMinOrderValue() != null && orderAmount != null
                && orderAmount.compareTo(v.getMinOrderValue()) < 0) {
            resp.setValid(false);
            resp.setMessage("Đơn hàng tối thiểu " + v.getMinOrderValue().toPlainString() + " VNĐ để dùng mã này");
            return resp;
        }

        BigDecimal discount = calculateDiscount(v, orderAmount);
        BigDecimal finalAmt = (orderAmount != null ? orderAmount : BigDecimal.ZERO).subtract(discount);
        if (finalAmt.compareTo(BigDecimal.ZERO) < 0) finalAmt = BigDecimal.ZERO;

        resp.setValid(true);
        resp.setMessage("Áp dụng mã thành công!");
        resp.setCode(v.getCode());
        resp.setDiscountType(v.getDiscountType());
        resp.setDiscountValue(v.getDiscountValue());
        resp.setDiscountAmount(discount);
        resp.setFinalAmount(finalAmt);
        return resp;
    }

    @Override
    public BigDecimal applyVoucher(String code, BigDecimal orderAmount) {
        if (code == null || code.isBlank()) return BigDecimal.ZERO;

        VoucherValidateResponse result = validate(code, orderAmount);
        if (!result.isValid()) throw new IllegalArgumentException(result.getMessage());

        Voucher v = voucherRepository.findByCodeIgnoreCase(code.trim()).orElseThrow();
        v.setUsedCount((v.getUsedCount() == null ? 0 : v.getUsedCount()) + 1);
        voucherRepository.save(v);

        return result.getDiscountAmount();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private BigDecimal calculateDiscount(Voucher v, BigDecimal orderAmount) {
        if (orderAmount == null || v.getDiscountValue() == null) return BigDecimal.ZERO;
        if ("PERCENTAGE".equalsIgnoreCase(v.getDiscountType())) {
            return orderAmount.multiply(v.getDiscountValue())
                    .divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP);
        }
        // FIXED
        return v.getDiscountValue().min(orderAmount);
    }

    private void fillFromDTO(Voucher v, VoucherDTO dto) {
        String discountType = dto.getDiscountType() != null ? dto.getDiscountType() : v.getDiscountType();
        BigDecimal discountValue = dto.getDiscountValue() != null ? dto.getDiscountValue() : v.getDiscountValue();
        if (discountValue != null) {
            if (discountValue.signum() <= 0) {
                throw new IllegalArgumentException("Giá trị giảm giá phải lớn hơn 0");
            }
            if ("PERCENTAGE".equalsIgnoreCase(discountType) && discountValue.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new IllegalArgumentException("Giá trị giảm giá theo phần trăm không được lớn hơn 100");
            }
        }
        if (dto.getMinOrderValue() != null && dto.getMinOrderValue().signum() < 0) {
            throw new IllegalArgumentException("Giá trị đơn hàng tối thiểu không được âm");
        }
        if (dto.getMaxUses() != null && dto.getMaxUses() < 1) {
            throw new IllegalArgumentException("Số lượt sử dụng tối đa phải lớn hơn 0");
        }
        String validFrom = dto.getValidFrom() != null && !dto.getValidFrom().isBlank() ? dto.getValidFrom() : null;
        String validTo = dto.getValidTo() != null && !dto.getValidTo().isBlank() ? dto.getValidTo() : null;
        if (validFrom != null && validTo != null && LocalDate.parse(validFrom).isAfter(LocalDate.parse(validTo))) {
            throw new IllegalArgumentException("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        }

        if (dto.getDiscountType() != null) v.setDiscountType(dto.getDiscountType());
        if (dto.getDiscountValue() != null) v.setDiscountValue(dto.getDiscountValue());
        if (dto.getMinOrderValue() != null) v.setMinOrderValue(dto.getMinOrderValue());
        if (dto.getMaxUses() != null) v.setMaxUses(dto.getMaxUses());
        if (validFrom != null) v.setValidFrom(LocalDate.parse(validFrom));
        if (validTo != null) v.setValidTo(LocalDate.parse(validTo));
        if (dto.getDescription() != null) v.setDescription(dto.getDescription());
        if (dto.getStatus() != null) v.setStatus(dto.getStatus());
    }

    private VoucherDTO toDTO(Voucher v) {
        VoucherDTO dto = new VoucherDTO();
        dto.setId(v.getId());
        dto.setCode(v.getCode());
        dto.setDiscountType(v.getDiscountType());
        dto.setDiscountValue(v.getDiscountValue());
        dto.setMinOrderValue(v.getMinOrderValue());
        dto.setMaxUses(v.getMaxUses());
        dto.setUsedCount(v.getUsedCount());
        dto.setValidFrom(v.getValidFrom() != null ? v.getValidFrom().toString() : null);
        dto.setValidTo(v.getValidTo() != null ? v.getValidTo().toString() : null);
        dto.setDescription(v.getDescription());
        dto.setStatus(v.getStatus());
        return dto;
    }

    private Voucher findOrThrow(Long id) {
        return voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy voucher với ID: " + id));
    }
}
