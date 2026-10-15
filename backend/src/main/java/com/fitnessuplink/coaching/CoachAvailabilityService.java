package com.fitnessuplink.coaching;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.coaching.dto.CoachingDtos.AvailabilityExceptionDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.AvailabilityRuleDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CreateAvailabilityExceptionRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.TimeSlotDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.UpsertAvailabilityRuleRequest;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoachAvailabilityService {

    private final CoachAvailabilityRuleRepository ruleRepository;
    private final CoachAvailabilityExceptionRepository exceptionRepository;
    private final CoachServiceRepository coachServiceRepository;
    private final CoachingBookingRepository bookingRepository;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public List<AvailabilityRuleDto> rules(User coach) {
        requireCoach(coach);
        return ruleRepository.findByCoachIdOrderByDayOfWeekAscStartTimeAsc(coach.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public AvailabilityRuleDto createRule(User coach, UpsertAvailabilityRuleRequest request) {
        requireCoach(coach);
        validateRule(coach, request, null);
        CoachAvailabilityRule rule = CoachAvailabilityRule.builder()
                .id(UUID.randomUUID())
                .coachId(coach.getId())
                .dayOfWeek(request.dayOfWeek().shortValue())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .active(true)
                .build();
        return toDto(ruleRepository.save(rule));
    }

    @Transactional
    public AvailabilityRuleDto updateRule(User coach, UUID id, UpsertAvailabilityRuleRequest request) {
        requireCoach(coach);
        CoachAvailabilityRule rule = ruleRepository.findByIdAndCoachId(id, coach.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "AVAILABILITY_RULE_NOT_FOUND"));
        validateRule(coach, request, id);
        rule.setDayOfWeek(request.dayOfWeek().shortValue());
        rule.setStartTime(request.startTime());
        rule.setEndTime(request.endTime());
        return toDto(ruleRepository.save(rule));
    }

    /** Checks day and time range, and refuses a window that overlaps another one the same day. */
    private void validateRule(User coach, UpsertAvailabilityRuleRequest request, UUID ignoreId) {
        if (request.dayOfWeek() == null || request.dayOfWeek() < 0 || request.dayOfWeek() > 6) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DAY_OF_WEEK_INVALID");
        }
        if (request.startTime() == null || request.endTime() == null || !request.startTime().isBefore(request.endTime())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TIME_RANGE_INVALID");
        }
        boolean overlaps = ruleRepository.findByCoachIdOrderByDayOfWeekAscStartTimeAsc(coach.getId()).stream()
                .filter(other -> other.isActive() && (ignoreId == null || !other.getId().equals(ignoreId)))
                .filter(other -> other.getDayOfWeek() == request.dayOfWeek().shortValue())
                .anyMatch(other -> request.startTime().isBefore(other.getEndTime()) && request.endTime().isAfter(other.getStartTime()));
        if (overlaps) {
            throw new ApiException(HttpStatus.CONFLICT, "AVAILABILITY_RULE_OVERLAP");
        }
    }

    @Transactional
    public void deleteRule(User coach, UUID id) {
        requireCoach(coach);
        CoachAvailabilityRule rule = ruleRepository.findByIdAndCoachId(id, coach.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "AVAILABILITY_RULE_NOT_FOUND"));
        ruleRepository.delete(rule);
    }

    @Transactional(readOnly = true)
    public List<AvailabilityExceptionDto> exceptions(User coach, LocalDate from, LocalDate to) {
        requireCoach(coach);
        return exceptionRepository.findByCoachIdAndExceptionDateBetween(coach.getId(), from, to).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public AvailabilityExceptionDto createException(User coach, CreateAvailabilityExceptionRequest request) {
        requireCoach(coach);
        if (request.date() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DATE_REQUIRED");
        }
        CoachAvailabilityException exception = CoachAvailabilityException.builder()
                .id(UUID.randomUUID())
                .coachId(coach.getId())
                .exceptionDate(request.date())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .note(request.note() == null || request.note().isBlank() ? null : request.note().trim())
                .build();
        return toDto(exceptionRepository.save(exception));
    }

    @Transactional
    public void deleteException(User coach, UUID id) {
        requireCoach(coach);
        CoachAvailabilityException exception = exceptionRepository.findByIdAndCoachId(id, coach.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "AVAILABILITY_EXCEPTION_NOT_FOUND"));
        exceptionRepository.delete(exception);
    }

    @Transactional(readOnly = true)
    public List<TimeSlotDto> slotsFor(UUID coachId, UUID coachServiceId, LocalDate date) {
        CoachService service = coachServiceRepository.findById(coachServiceId)
                .filter(item -> item.getCoachId().equals(coachId) && item.isActive())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COACH_SERVICE_NOT_FOUND"));
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        List<CoachAvailabilityRule> rules = ruleRepository.findByCoachIdOrderByDayOfWeekAscStartTimeAsc(coachId).stream()
                .filter(rule -> rule.isActive() && rule.getDayOfWeek() == dayOfWeek)
                .toList();
        List<CoachAvailabilityException> exceptions = exceptionRepository.findByCoachIdAndExceptionDateBetween(coachId, date, date);
        boolean fullDayBlocked = exceptions.stream().anyMatch(e -> e.getStartTime() == null && e.getEndTime() == null);
        if (fullDayBlocked) {
            return List.of();
        }
        Instant dayStart = date.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        List<CoachingBooking> existing = bookingRepository.findByCoachIdAndScheduledAtBetween(coachId, dayStart, dayEnd).stream()
                .filter(CoachAvailabilityService::holdsSlot)
                .toList();

        java.util.Map<Instant, TimeSlotDto> slotsByStart = new java.util.LinkedHashMap<>();
        int duration = service.getDurationMinutes();
        for (CoachAvailabilityRule rule : rules) {
            LocalTime cursor = rule.getStartTime();
            while (!cursor.plusMinutes(duration).isAfter(rule.getEndTime())) {
                LocalTime slotStart = cursor;
                LocalTime slotEnd = cursor.plusMinutes(duration);
                Instant startInstant = LocalDateTime.of(date, slotStart).toInstant(ZoneOffset.UTC);
                Instant endInstant = LocalDateTime.of(date, slotEnd).toInstant(ZoneOffset.UTC);
                if (!slotsByStart.containsKey(startInstant)) {
                    boolean blockedByException = exceptions.stream().anyMatch(e ->
                            e.getStartTime() != null && e.getEndTime() != null
                                    && slotStart.isBefore(e.getEndTime()) && slotEnd.isAfter(e.getStartTime()));
                    boolean overlapsBooking = existing.stream().anyMatch(booking ->
                            startInstant.isBefore(booking.endsAt()) && endInstant.isAfter(booking.getScheduledAt()));
                    boolean available = !blockedByException && !overlapsBooking && startInstant.isAfter(Instant.now());
                    slotsByStart.put(startInstant, new TimeSlotDto(startInstant, endInstant, available));
                }
                cursor = slotEnd;
            }
        }
        return slotsByStart.values().stream()
                .sorted(java.util.Comparator.comparing(TimeSlotDto::start))
                .toList();
    }

    @Transactional(readOnly = true)
    public LocalDate nextAvailableDate(UUID coachId, UUID coachServiceId, LocalDate from) {
        LocalDate cursor = from;
        for (int i = 0; i < 60; i++) {
            boolean hasSlot = slotsFor(coachId, coachServiceId, cursor).stream().anyMatch(TimeSlotDto::available);
            if (hasSlot) {
                return cursor;
            }
            cursor = cursor.plusDays(1);
        }
        return null;
    }

    static boolean holdsSlot(CoachingBooking booking) {
        CoachingBookingStatus status = booking.getStatus();
        return status == CoachingBookingStatus.PENDING
                || status == CoachingBookingStatus.AWAITING_PAYMENT
                || status == CoachingBookingStatus.CONFIRMED;
    }

    private void requireCoach(User user) {
        permissionService.require(user, Permissions.COACHING_MANAGE);
    }

    private AvailabilityRuleDto toDto(CoachAvailabilityRule rule) {
        return new AvailabilityRuleDto(rule.getId(), rule.getDayOfWeek(), rule.getStartTime(), rule.getEndTime(), rule.isActive());
    }

    private AvailabilityExceptionDto toDto(CoachAvailabilityException exception) {
        return new AvailabilityExceptionDto(
                exception.getId(),
                exception.getExceptionDate(),
                exception.getStartTime(),
                exception.getEndTime(),
                exception.getNote()
        );
    }
}
