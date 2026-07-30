package com.movie_be.movie.service.impl;

import com.movie_be.movie.dto.ScheduleDTO;
import com.movie_be.movie.dto.ScheduleSeatResponse;
import com.movie_be.movie.entity.cinemaroom.CinemaRoom;
import com.movie_be.movie.entity.movie.Movie;
import com.movie_be.movie.entity.schedule.Schedule;
import com.movie_be.movie.entity.schedule.ScheduleSeat;
import com.movie_be.movie.repository.CinemaRoomRepository;
import com.movie_be.movie.repository.MovieRepository;
import com.movie_be.movie.repository.ScheduleRepository;
import com.movie_be.movie.repository.ScheduleSeatRepository;
import com.movie_be.movie.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleServiceImpl implements ScheduleService {

    private static final String[] COLUMNS = {"A", "B", "C", "D", "E", "F", "G", "H"};
    private static final int CLEANING_TIME_MINUTES = 15;

    private final ScheduleRepository scheduleRepository;
    private final ScheduleSeatRepository scheduleSeatRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;

    @Override
    public List<ScheduleDTO> getAll() {
        return scheduleRepository.findAll().stream()
                .sorted(Comparator.comparing(Schedule::getShowDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Schedule::getScheduleTime, Comparator.nullsLast(String::compareTo))
                        .thenComparing(Schedule::getScheduleId))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public ScheduleDTO getById(Integer scheduleId) {
        return toDto(findSchedule(scheduleId));
    }

    @Override
    public List<ScheduleDTO> getByMovie(String movieId) {
        findMovie(movieId);
        return scheduleRepository.findAllByMovieIdOrderByShowDateAscScheduleTimeAscCinemaRoomIdAsc(movieId).stream()
                .filter(this::isActiveSchedule)
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getDatesByMovie(String movieId) {
        return getByMovie(movieId).stream()
                .map(ScheduleDTO::getShowDate)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getTimesByMovieAndDate(String movieId, String showDate) {
        LocalDate parsedDate = parseShowDate(showDate);
        return scheduleRepository.findAllByMovieIdAndShowDateOrderByScheduleTimeAscCinemaRoomIdAsc(movieId, parsedDate).stream()
                .filter(this::isActiveSchedule)
                .map(Schedule::getScheduleTime)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    public List<ScheduleDTO> getRoomsByMovieDateAndTime(String movieId, String showDate, String scheduleTime) {
        if (scheduleTime == null || scheduleTime.isBlank()) {
            throw new IllegalArgumentException("scheduleTime is required");
        }
        LocalDate parsedDate = parseShowDate(showDate);
        return scheduleRepository.findAllByMovieIdAndShowDateAndScheduleTimeOrderByCinemaRoomIdAsc(
                        movieId,
                        parsedDate,
                        scheduleTime.trim()
                ).stream()
                .filter(this::isActiveSchedule)
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ScheduleDTO create(ScheduleDTO dto) {
        validateSchedulePayload(dto);
        LocalDate showDate = parseShowDate(dto.getShowDate());
        validateNotPast(showDate);

        Movie movie = findMovie(dto.getMovieId());
        CinemaRoom room = findCinemaRoom(dto.getCinemaRoomId());
        validateRoomTimeOverlap(null, movie, room, showDate, dto.getScheduleTime().trim());

        Integer scheduleId = dto.getScheduleId() != null ? dto.getScheduleId() : generateNextScheduleId();
        if (scheduleRepository.existsById(scheduleId)) {
            throw new IllegalArgumentException("Schedule already exists: " + scheduleId);
        }

        Schedule schedule = new Schedule();
        schedule.setScheduleId(scheduleId);
        applyScheduleFields(schedule, movie.getMovieId(), showDate, dto.getScheduleTime(), room.getCinemaRoomId());
        applyOptionalFields(schedule, dto);

        Schedule saved = scheduleRepository.save(schedule);
        ensureScheduleSeats(saved, room);
        return toDto(saved);
    }

    @Override
    @Transactional
    public ScheduleDTO update(Integer scheduleId, ScheduleDTO dto) {
        Schedule schedule = findSchedule(scheduleId);
        if (hasBookedSeats(scheduleId)) {
            throw new IllegalStateException("Cannot update schedule because tickets already exist");
        }

        validateSchedulePayload(dto);
        LocalDate showDate = parseShowDate(dto.getShowDate());
        validateNotPast(showDate);

        Movie movie = findMovie(dto.getMovieId());
        CinemaRoom room = findCinemaRoom(dto.getCinemaRoomId());
        validateRoomTimeOverlap(scheduleId, movie, room, showDate, dto.getScheduleTime().trim());

        boolean seatLayoutChanged = !Objects.equals(schedule.getMovieId(), movie.getMovieId())
                || !Objects.equals(schedule.getCinemaRoomId(), room.getCinemaRoomId());

        applyScheduleFields(schedule, movie.getMovieId(), showDate, dto.getScheduleTime(), room.getCinemaRoomId());
        applyOptionalFields(schedule, dto);
        Schedule saved = scheduleRepository.save(schedule);

        if (seatLayoutChanged) {
            scheduleSeatRepository.deleteAllByShowtimeId(scheduleId);
            ensureScheduleSeats(saved, room);
        } else if (scheduleSeatRepository.findAllByShowtimeId(scheduleId).isEmpty()) {
            ensureScheduleSeats(saved, room);
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public void delete(Integer scheduleId) {
        Schedule schedule = findSchedule(scheduleId);
        if (hasBookedSeats(scheduleId)) {
            throw new IllegalStateException("Cannot delete schedule because tickets already exist");
        }
        scheduleSeatRepository.deleteAllByShowtimeId(scheduleId);
        scheduleRepository.delete(schedule);
    }

    @Override
    @Transactional
    public List<ScheduleSeatResponse> createSeatsForMovie(Integer scheduleId, String movieId) {
        Schedule schedule = findSchedule(scheduleId);
        if (schedule.getMovieId() == null || schedule.getShowDate() == null || schedule.getCinemaRoomId() == null) {
            if (movieId == null || movieId.isBlank()) {
                throw new IllegalArgumentException("movieId is required");
            }
            Movie movie = findMovie(movieId);
            Integer roomId = movie.getCinemaRoomId();
            CinemaRoom room = findCinemaRoom(roomId);
            applyScheduleFields(schedule, movie.getMovieId(), LocalDate.now(), schedule.getScheduleTime(), room.getCinemaRoomId());
            scheduleRepository.save(schedule);
        }

        CinemaRoom room = findCinemaRoom(schedule.getCinemaRoomId());
        return ensureScheduleSeats(schedule, room).stream()
                .map(this::toSeatResponse)
                .collect(Collectors.toList());
    }

    private List<ScheduleSeat> ensureScheduleSeats(Schedule schedule, CinemaRoom room) {
        List<ScheduleSeat> existingSeats = scheduleSeatRepository.findAllByShowtimeId(schedule.getScheduleId());
        if (!existingSeats.isEmpty()) {
            // Self-heal: if stored seat count doesn't match room capacity and none are booked, recreate.
            int expected = room.getSeatQuantity() != null ? room.getSeatQuantity() : 0;
            if (expected > 0 && existingSeats.size() != expected) {
                boolean hasBooked = existingSeats.stream()
                        .anyMatch(s -> s.getSeatStatus() != null && s.getSeatStatus() == 1);
                if (!hasBooked) {
                    scheduleSeatRepository.deleteAll(existingSeats);
                } else {
                    return existingSeats;
                }
            } else {
                return existingSeats;
            }
        }

        List<ScheduleSeat> legacySeats = scheduleSeatRepository.findAllByScheduleId(schedule.getScheduleId());
        if (!legacySeats.isEmpty()) {
            for (ScheduleSeat legacySeat : legacySeats) {
                legacySeat.setShowtimeId(schedule.getScheduleId());
            }
            return scheduleSeatRepository.saveAll(legacySeats);
        }

        // Always generate virtual seats from room.seatQuantity.
        // The physical seat table may have stale rows that don't match seat_quantity,
        // so it is intentionally skipped here.
        List<ScheduleSeat> seats = buildVirtualScheduleSeats(schedule, room.getSeatQuantity());
        return scheduleSeatRepository.saveAll(seats);
    }

    private List<ScheduleSeat> buildVirtualScheduleSeats(Schedule schedule, Integer seatQuantity) {
        if (seatQuantity == null || seatQuantity <= 0) {
            throw new IllegalArgumentException("Cinema room seat quantity is invalid");
        }

        List<ScheduleSeat> seats = new ArrayList<>(seatQuantity);
        int generated = 0;
        int row = 1;

        while (generated < seatQuantity) {
            for (int c = 0; c < COLUMNS.length && generated < seatQuantity; c++) {
                ScheduleSeat seat = new ScheduleSeat();
                seat.setMovieId(schedule.getMovieId());
                seat.setScheduleId(schedule.getScheduleId());
                seat.setShowtimeId(schedule.getScheduleId());
                seat.setSeatId(null);
                seat.setSeatRow(row);
                seat.setSeatColumn(COLUMNS[c]);
                seat.setSeatStatus((short) 0);
                seat.setSeatType((short) 1);
                seats.add(seat);
                generated++;
            }
            row++;
        }

        return seats;
    }

    private void applyScheduleFields(Schedule schedule, String movieId, LocalDate showDate, String scheduleTime, Integer cinemaRoomId) {
        schedule.setMovieId(movieId);
        schedule.setShowDate(showDate);
        schedule.setScheduleTime(scheduleTime.trim());
        schedule.setCinemaRoomId(cinemaRoomId);
    }

    private void applyOptionalFields(Schedule schedule, ScheduleDTO dto) {
        schedule.setStatus(dto.getStatus() != null ? dto.getStatus() : 1);
        schedule.setNote(dto.getNote() != null && !dto.getNote().isBlank() ? dto.getNote().trim() : null);
    }

    private void validateSchedulePayload(ScheduleDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("ScheduleDTO is null");
        }
        if (dto.getMovieId() == null || dto.getMovieId().isBlank()) {
            throw new IllegalArgumentException("movieId is required");
        }
        if (dto.getShowDate() == null || dto.getShowDate().isBlank()) {
            throw new IllegalArgumentException("showDate is required");
        }
        if (dto.getScheduleTime() == null || dto.getScheduleTime().isBlank()) {
            throw new IllegalArgumentException("scheduleTime is required");
        }
        if (dto.getCinemaRoomId() == null) {
            throw new IllegalArgumentException("cinemaRoomId is required");
        }
        if (dto.getStatus() != null && dto.getStatus() != 1 && dto.getStatus() != 0) {
            throw new IllegalArgumentException("status must be 1 (active) or 0 (paused)");
        }
    }

    private LocalDate parseShowDate(String value) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("showDate must be yyyy-MM-dd");
        }
    }

    private void validateNotPast(LocalDate showDate) {
        if (showDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Cannot create or update a schedule in the past");
        }
    }

    private void validateRoomTimeOverlap(Integer currentScheduleId, Movie newMovie, CinemaRoom room, LocalDate showDate, String scheduleTime) {
        LocalTime newStart = parseScheduleTime(scheduleTime);
        LocalTime newEnd = calculateEndTime(newStart, newMovie.getDuration());

        List<Schedule> sameRoomSchedules = scheduleRepository
                .findAllByCinemaRoomIdAndShowDateOrderByScheduleTimeAsc(room.getCinemaRoomId(), showDate);

        for (Schedule existing : sameRoomSchedules) {
            if (currentScheduleId != null && Objects.equals(existing.getScheduleId(), currentScheduleId)) {
                continue;
            }
            if (existing.getScheduleTime() == null || existing.getMovieId() == null) {
                continue;
            }

            Movie existingMovie = findMovie(existing.getMovieId());
            LocalTime existingStart = parseScheduleTime(existing.getScheduleTime());
            LocalTime existingEnd = calculateEndTime(existingStart, existingMovie.getDuration());

            if (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart)) {
                throw new IllegalArgumentException(String.format(
                        "%s đã có suất chiếu từ %s đến %s. Vui lòng chọn giờ khác.",
                        room.getCinemaRoomName(),
                        formatTime(existingStart),
                        formatTime(existingEnd)
                ));
            }
        }
    }

    private LocalTime parseScheduleTime(String scheduleTime) {
        try {
            return LocalTime.parse(scheduleTime);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Giờ chiếu không hợp lệ.");
        }
    }

    private LocalTime calculateEndTime(LocalTime startTime, Integer duration) {
        if (duration == null || duration <= 0) {
            throw new IllegalArgumentException("Thời lượng phim không hợp lệ.");
        }
        return startTime.plusMinutes(duration + CLEANING_TIME_MINUTES);
    }

    private String formatTime(LocalTime time) {
        return time.toString();
    }

    private boolean isActiveSchedule(Schedule schedule) {
        return schedule.getStatus() == null || schedule.getStatus() == 1;
    }

    private boolean hasBookedSeats(Integer scheduleId) {
        return scheduleSeatRepository.countByShowtimeIdAndSeatStatus(scheduleId, (short) 1) > 0;
    }

    private Schedule findSchedule(Integer scheduleId) {
        if (scheduleId == null) {
            throw new IllegalArgumentException("scheduleId is required");
        }
        return scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("Schedule not found: " + scheduleId));
    }

    private Movie findMovie(String movieId) {
        return movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + movieId));
    }

    private CinemaRoom findCinemaRoom(Integer cinemaRoomId) {
        return cinemaRoomRepository.findById(cinemaRoomId)
                .orElseThrow(() -> new RuntimeException("Cinema room not found: " + cinemaRoomId));
    }

    private Integer generateNextScheduleId() {
        return scheduleRepository.findAll().stream()
                .map(Schedule::getScheduleId)
                .filter(id -> id != null)
                .max(Integer::compareTo)
                .orElse(0) + 1;
    }

    private ScheduleDTO toDto(Schedule schedule) {
        String movieTitle = null;
        if (schedule.getMovieId() != null) {
            movieTitle = movieRepository.findById(schedule.getMovieId())
                    .map(Movie::getMovieNameVn)
                    .orElse(null);
        }

        String roomName = null;
        Integer seatQuantity = null;
        if (schedule.getCinemaRoomId() != null) {
            CinemaRoom room = cinemaRoomRepository.findById(schedule.getCinemaRoomId()).orElse(null);
            if (room != null) {
                roomName = room.getCinemaRoomName();
                seatQuantity = room.getSeatQuantity();
            }
        }

        Integer status = schedule.getStatus() != null ? schedule.getStatus() : 1;
        return new ScheduleDTO(
                schedule.getScheduleId(),
                schedule.getMovieId(),
                movieTitle,
                schedule.getShowDate() != null ? schedule.getShowDate().toString() : null,
                schedule.getScheduleTime(),
                schedule.getCinemaRoomId(),
                roomName,
                status,
                schedule.getNote(),
                hasBookedSeats(schedule.getScheduleId()),
                schedule.getScheduleId(),
                movieTitle,
                seatQuantity,
                status == 1 ? "ACTIVE" : "PAUSED"
        );
    }

    private ScheduleSeatResponse toSeatResponse(ScheduleSeat ss) {
        String seatCode = String.valueOf((char) ('A' + ss.getSeatRow() - 1))
                + (ss.getSeatColumn().charAt(0) - 'A' + 1);

        ScheduleSeatResponse response = new ScheduleSeatResponse();
        response.setSeatCode(seatCode);
        response.setSeatType(ss.getSeatType());
        response.setBooked(ss.getSeatStatus() != null && ss.getSeatStatus() == 1);
        return response;
    }
}
