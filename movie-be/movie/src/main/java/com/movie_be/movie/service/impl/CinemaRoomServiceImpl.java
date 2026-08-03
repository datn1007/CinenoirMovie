package com.movie_be.movie.service.impl;

import com.movie_be.movie.dto.CinemaRoomDTO;
import com.movie_be.movie.dto.SeatStatusDTO;
import com.movie_be.movie.entity.cinemaroom.CinemaRoom;
import com.movie_be.movie.repository.CinemaRoomRepository;
import com.movie_be.movie.repository.ScheduleSeatRepository;
import com.movie_be.movie.service.CinemaRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CinemaRoomServiceImpl implements CinemaRoomService {

    private final CinemaRoomRepository cinemaRoomRepository;
    private final ScheduleSeatRepository scheduleSeatRepository;

    // Cố định 10 cột/hàng — khớp với ScheduleServiceImpl.COLUMNS, nơi thực sự sinh ghế cho suất
    // chiếu. Phòng tối đa 80 ghế (CinemaRoomDTO) nên luôn vừa đúng 8 hàng x 10 cột, nằm trong
    // giới hạn hàng A-H mà SeatReservationServiceImpl.parseSeatCode chấp nhận khi đặt vé.
    private static final int MIN_COLUMNS = 10;
    private static final int MAX_COLUMNS = 10;
    private static final int IDEAL_COLUMNS = 10;

    @Override
    public List<CinemaRoomDTO> getAllActive() {
        return cinemaRoomRepository.findAllActive().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public CinemaRoomDTO getById(Integer id) {
        CinemaRoom room = cinemaRoomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cinema room not found: " + id));
        return toDto(room);
    }

    @Override
    public CinemaRoomDTO create(CinemaRoomDTO dto) {
        CinemaRoom room = new CinemaRoom();
        room.setCinemaRoomName(dto.getCinemaRoomName());
        room.setSeatQuantity(dto.getSeatQuantity());
        room.setStatus(1);
        return toDto(cinemaRoomRepository.save(room));
    }

    @Override
    public CinemaRoomDTO update(Integer id, CinemaRoomDTO dto) {
        CinemaRoom room = cinemaRoomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cinema room not found: " + id));
        room.setCinemaRoomName(dto.getCinemaRoomName());
        room.setSeatQuantity(dto.getSeatQuantity());
        return toDto(cinemaRoomRepository.save(room));
    }

    @Override
    public void softDelete(Integer id) {
        CinemaRoom room = cinemaRoomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cinema room not found: " + id));
        room.setStatus(0);
        cinemaRoomRepository.save(room);
    }

    /**
     * Generate ghế ảo theo seat_quantity (không query bảng seat).
     * Số cột được chọn động (8-14) sao cho hàng cuối bị hụt ít ghế nhất — giống cách
     * các rạp thật (CGV, Galaxy) chia hàng/cột theo tổng số ghế thay vì luôn cố định 8 cột.
     * Check ghế đã đặt qua schedule_seat → movie.cinema_room_id.
     */
    @Override
    public List<SeatStatusDTO> getSeatsWithStatus(Integer cinemaRoomId) {
        CinemaRoom room = cinemaRoomRepository.findById(cinemaRoomId)
                .orElseThrow(() -> new RuntimeException("Cinema room not found: " + cinemaRoomId));

        int total = room.getSeatQuantity();
        int columns = computeColumns(total);

        // Lấy tập (row_col) của các ghế đã đặt thuộc phòng này
        Set<String> bookedKeys = scheduleSeatRepository.findBookedByRoom(cinemaRoomId)
                .stream()
                .map(ss -> ss.getSeatRow() + "_" + ss.getSeatColumn())
                .collect(Collectors.toSet());

        List<SeatStatusDTO> result = new ArrayList<>(total);
        int generated = 0;
        int row = 1;

        while (generated < total) {
            for (int c = 0; c < columns && generated < total; c++) {
                String columnLabel = String.valueOf((char) ('A' + c));
                SeatStatusDTO dto = new SeatStatusDTO();
                dto.setSeatId(generated + 1);       // ID ảo, tăng dần
                dto.setSeatRow(row);
                dto.setSeatColumn(columnLabel);
                dto.setSeatType((short) 1);
                dto.setBooked(bookedKeys.contains(row + "_" + columnLabel));
                result.add(dto);
                generated++;
            }
            row++;
        }

        return result;
    }

    /**
     * Chọn số cột (8-14) khiến hàng cuối hụt ít ghế nhất so với các hàng đầy phía trên;
     * nếu nhiều lựa chọn hụt bằng nhau thì ưu tiên số cột gần 12 (bề ngang phổ biến ở rạp thật).
     */
    private int computeColumns(int total) {
        int bestColumns = MIN_COLUMNS;
        int bestLeftover = Integer.MAX_VALUE;
        int bestDistanceToIdeal = Integer.MAX_VALUE;

        for (int c = MIN_COLUMNS; c <= MAX_COLUMNS; c++) {
            int rows = (total + c - 1) / c;
            int leftover = rows * c - total;
            int distanceToIdeal = Math.abs(c - IDEAL_COLUMNS);
            if (leftover < bestLeftover || (leftover == bestLeftover && distanceToIdeal < bestDistanceToIdeal)) {
                bestLeftover = leftover;
                bestDistanceToIdeal = distanceToIdeal;
                bestColumns = c;
            }
        }
        return bestColumns;
    }

    private CinemaRoomDTO toDto(CinemaRoom room) {
        CinemaRoomDTO dto = new CinemaRoomDTO();
        dto.setCinemaRoomId(room.getCinemaRoomId());
        dto.setCinemaRoomName(room.getCinemaRoomName());
        dto.setSeatQuantity(room.getSeatQuantity());
        dto.setStatus(room.getStatus() != null ? room.getStatus() : 1);
        return dto;
    }
}
