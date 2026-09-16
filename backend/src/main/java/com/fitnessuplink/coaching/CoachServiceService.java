package com.fitnessuplink.coaching;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachServiceDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.UpsertCoachServiceRequest;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoachServiceService {

    private final CoachServiceRepository coachServiceRepository;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public List<CoachServiceDto> list(User coach) {
        requireCoach(coach);
        return coachServiceRepository.findByCoachIdOrderByCreatedAtDesc(coach.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public CoachServiceDto create(User coach, UpsertCoachServiceRequest request) {
        requireCoach(coach);
        Instant now = Instant.now();
        CoachService entity = CoachService.builder()
                .id(UUID.randomUUID())
                .coachId(coach.getId())
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        apply(entity, request);
        return toDto(coachServiceRepository.save(entity));
    }

    @Transactional
    public CoachServiceDto update(User coach, UUID id, UpsertCoachServiceRequest request) {
        requireCoach(coach);
        CoachService entity = requireOwned(coach.getId(), id);
        apply(entity, request);
        entity.setUpdatedAt(Instant.now());
        return toDto(coachServiceRepository.save(entity));
    }

    @Transactional
    public void delete(User coach, UUID id) {
        requireCoach(coach);
        CoachService entity = requireOwned(coach.getId(), id);
        coachServiceRepository.delete(entity);
    }

    CoachService requireOwned(UUID coachId, UUID id) {
        return coachServiceRepository.findByIdAndCoachId(id, coachId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COACH_SERVICE_NOT_FOUND"));
    }

    void requireCoach(User user) {
        permissionService.require(user, Permissions.COACHING_MANAGE);
    }

    private void apply(CoachService entity, UpsertCoachServiceRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SERVICE_NAME_REQUIRED");
        }
        if (request.durationMinutes() == null || request.durationMinutes() < 5 || request.durationMinutes() > 480) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SERVICE_DURATION_INVALID");
        }
        BigDecimal price = request.priceAmount();
        if (price == null || price.signum() < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SERVICE_PRICE_INVALID");
        }
        String currency = request.priceCurrency() == null ? "" : request.priceCurrency().trim().toUpperCase();
        if (currency.length() != 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SERVICE_CURRENCY_INVALID");
        }
        entity.setName(name);
        entity.setDescription(request.description() == null || request.description().isBlank() ? null : request.description().trim());
        entity.setDurationMinutes(request.durationMinutes());
        entity.setPriceAmount(price);
        entity.setPriceCurrency(currency);
        if (request.active() != null) {
            entity.setActive(request.active());
        }
    }

    private CoachServiceDto toDto(CoachService entity) {
        return new CoachServiceDto(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getDurationMinutes(),
                entity.getPriceAmount(),
                entity.getPriceCurrency(),
                entity.isActive()
        );
    }
}
