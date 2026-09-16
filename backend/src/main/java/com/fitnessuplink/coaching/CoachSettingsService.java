package com.fitnessuplink.coaching;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachSettingsDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.UpdateCoachSettingsRequest;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoachSettingsService {

    private static final int MAX_DEADLINE_HOURS = 168;

    private final CoachSettingsRepository coachSettingsRepository;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public CoachSettingsDto get(User coach) {
        permissionService.require(coach, Permissions.COACHING_MANAGE);
        return toDto(coachSettingsRepository.findById(coach.getId()).orElse(null));
    }

    @Transactional
    public CoachSettingsDto update(User coach, UpdateCoachSettingsRequest request) {
        permissionService.require(coach, Permissions.COACHING_MANAGE);
        int hours = request == null || request.cancellationDeadlineHours() == null
                ? 0
                : Math.max(0, Math.min(MAX_DEADLINE_HOURS, request.cancellationDeadlineHours()));
        CoachSettings settings = coachSettingsRepository.findById(coach.getId())
                .orElseGet(() -> CoachSettings.builder().coachId(coach.getId()).build());
        settings.setCancellationDeadlineHours(hours);
        settings.setUpdatedAt(Instant.now());
        coachSettingsRepository.save(settings);
        return toDto(settings);
    }

    int deadlineHoursFor(UUID coachId) {
        return coachSettingsRepository.findById(coachId).map(CoachSettings::getCancellationDeadlineHours).orElse(0);
    }

    private CoachSettingsDto toDto(CoachSettings settings) {
        return new CoachSettingsDto(settings == null ? 0 : settings.getCancellationDeadlineHours());
    }
}
