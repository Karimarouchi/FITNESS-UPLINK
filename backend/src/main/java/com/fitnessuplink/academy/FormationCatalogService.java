package com.fitnessuplink.academy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.academy.dto.AcademyDtos.FormationCardDto;
import com.fitnessuplink.academy.dto.AcademyDtos.FormationDetailDto;
import com.fitnessuplink.academy.dto.AcademyDtos.FormationPageDto;
import com.fitnessuplink.academy.dto.AcademyDtos.FormationSessionDto;
import com.fitnessuplink.academy.dto.AcademyDtos.OrganizerSummaryDto;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormationCatalogService {

    private static final List<FormationRegistrationStatus> ACTIVE_STATUSES =
            List.of(FormationRegistrationStatus.PENDING_PAYMENT, FormationRegistrationStatus.CONFIRMED);

    private final FormationRepository formationRepository;
    private final FormationSessionRepository sessionRepository;
    private final FormationRegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final UploadService uploadService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public FormationPageDto search(String q, String contentType, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        String normalizedQ = q == null || q.isBlank() ? "" : q.trim();
        FormationContentType type = parseContentTypeOrNull(contentType);
        var result = formationRepository.search(type, normalizedQ, PageRequest.of(safePage, safeSize));
        Map<UUID, Formation> formations = formationRepository.findAllById(result.getContent()).stream()
                .collect(Collectors.toMap(Formation::getId, f -> f));
        List<FormationCardDto> items = result.getContent().stream()
                .map(formations::get)
                .filter(f -> f != null)
                .map(this::toCard)
                .toList();
        return new FormationPageDto(items, result.getTotalElements(), safePage, safeSize);
    }

    @Transactional(readOnly = true)
    public FormationDetailDto detail(UUID formationId) {
        Formation formation = requireVisible(formationId);
        List<FormationSessionDto> sessions = sessionRepository.findByFormationIdOrderByScheduledAtAsc(formationId).stream()
                .filter(s -> s.getStatus() != FormationSessionStatus.CANCELLED)
                .map(this::toSessionDto)
                .toList();
        return new FormationDetailDto(toCard(formation), formation.getDescription(), sessions);
    }

    Formation requireVisible(UUID formationId) {
        return formationRepository.findById(formationId)
                .filter(Formation::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload photo(UUID formationId, UUID uploadId) {
        Formation formation = requireVisible(formationId);
        if (formation.getImageUploadId() == null || !formation.getImageUploadId().equals(uploadId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PHOTO_NOT_FOUND");
        }
        return uploadService.loadAny(uploadId);
    }

    private FormationSessionDto toSessionDto(FormationSession session) {
        long confirmed = registrationRepository.countBySessionIdAndStatusIn(session.getId(), ACTIVE_STATUSES);
        int seatsLeft = Math.max(0, session.getCapacity() - (int) confirmed);
        return new FormationSessionDto(
                session.getId(),
                session.getFormationId(),
                session.getScheduledAt(),
                session.getDurationMinutes(),
                session.getCapacity(),
                (int) confirmed,
                seatsLeft,
                session.getStatus().name()
        );
    }

    private FormationCardDto toCard(Formation formation) {
        User organizer = userRepository.findById(formation.getOrganizerId()).orElse(null);
        FormationSession next = sessionRepository.findByFormationIdOrderByScheduledAtAsc(formation.getId()).stream()
                .filter(s -> s.getStatus() == FormationSessionStatus.SCHEDULED && s.getScheduledAt().isAfter(Instant.now()))
                .min(Comparator.comparing(FormationSession::getScheduledAt))
                .orElse(null);
        Instant nextAt = next == null ? null : next.getScheduledAt();
        Integer seatsLeft = null;
        if (next != null) {
            long confirmed = registrationRepository.countBySessionIdAndStatusIn(next.getId(), ACTIVE_STATUSES);
            seatsLeft = Math.max(0, next.getCapacity() - (int) confirmed);
        }
        return new FormationCardDto(
                formation.getId(),
                formation.getContentType().name(),
                formation.getTitle(),
                formation.getTrainerName(),
                formation.getLanguage(),
                formation.getLocation(),
                formation.isOnline(),
                formation.getPriceAmount(),
                formation.getPriceCurrency(),
                formation.isHasCertification(),
                formation.getImageUploadId(),
                organizerSummary(organizer),
                nextAt,
                seatsLeft
        );
    }

    private OrganizerSummaryDto organizerSummary(User organizer) {
        if (organizer == null) {
            return null;
        }
        Map<String, String> values = userProfileValueRepository.findByUserId(organizer.getId()).stream()
                .filter(v -> v.getValue() != null)
                .collect(Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (l, r) -> l));
        String name = text(values, "trade_name");
        if (name == null) {
            name = text(values, "legal_name");
        }
        if (name == null) {
            name = organizer.getDisplayName();
        }
        return new OrganizerSummaryDto(
                organizer.getId(),
                name,
                firstUploadId(values.get("organization_logo")),
                text(values, "org_city")
        );
    }

    private String text(Map<String, String> values, String key) {
        String value = values.get(key);
        return value == null || value.isBlank() ? null : value;
    }

    private UUID firstUploadId(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            JsonNode first = node.isArray() ? (node.isEmpty() ? null : node.get(0)) : node;
            if (first == null) {
                return null;
            }
            JsonNode idNode = first.get("id");
            return idNode == null || !idNode.isTextual() ? null : UUID.fromString(idNode.asText());
        } catch (Exception ex) {
            return null;
        }
    }

    private FormationContentType parseContentTypeOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return FormationContentType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
