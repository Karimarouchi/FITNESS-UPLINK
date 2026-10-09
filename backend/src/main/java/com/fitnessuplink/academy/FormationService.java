package com.fitnessuplink.academy;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.academy.dto.AcademyDtos.FormationDto;
import com.fitnessuplink.academy.dto.AcademyDtos.FormationSessionDto;
import com.fitnessuplink.academy.dto.AcademyDtos.ParticipantDto;
import com.fitnessuplink.academy.dto.AcademyDtos.UpsertFormationRequest;
import com.fitnessuplink.academy.dto.AcademyDtos.UpsertSessionRequest;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormationService {

    /** A seat is taken only once the registration is confirmed (paid, or free formation). */
    private static final List<FormationRegistrationStatus> SEAT_STATUSES =
            List.of(FormationRegistrationStatus.CONFIRMED);

    private final FormationRepository formationRepository;
    private final FormationSessionRepository sessionRepository;
    private final FormationRegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final UploadService uploadService;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public List<FormationDto> list(User organizer) {
        requireOrganizer(organizer);
        return formationRepository.findByOrganizerIdOrderByCreatedAtDesc(organizer.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public FormationDto create(User organizer, UpsertFormationRequest request) {
        requireOrganizer(organizer);
        Instant now = Instant.now();
        Formation formation = Formation.builder()
                .id(UUID.randomUUID())
                .organizerId(organizer.getId())
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        apply(formation, request);
        return toDto(formationRepository.save(formation));
    }

    @Transactional
    public FormationDto update(User organizer, UUID id, UpsertFormationRequest request) {
        requireOrganizer(organizer);
        Formation formation = requireOwned(organizer.getId(), id);
        apply(formation, request);
        formation.setUpdatedAt(Instant.now());
        return toDto(formationRepository.save(formation));
    }

    @Transactional
    public void delete(User organizer, UUID id) {
        requireOrganizer(organizer);
        formationRepository.delete(requireOwned(organizer.getId(), id));
    }

    @Transactional
    public UUID uploadImage(User organizer, MultipartFile file) {
        requireOrganizer(organizer);
        return uploadService.storeHireFile(organizer.getId(), file).getId();
    }

    @Transactional(readOnly = true)
    public List<FormationSessionDto> sessions(User organizer, UUID formationId) {
        requireOrganizer(organizer);
        requireOwned(organizer.getId(), formationId);
        return sessionRepository.findByFormationIdOrderByScheduledAtAsc(formationId).stream()
                .map(this::toSessionDto)
                .toList();
    }

    @Transactional
    public FormationSessionDto createSession(User organizer, UUID formationId, UpsertSessionRequest request) {
        requireOrganizer(organizer);
        requireOwned(organizer.getId(), formationId);
        validateSessionRequest(request);
        Instant now = Instant.now();
        FormationSession session = FormationSession.builder()
                .id(UUID.randomUUID())
                .formationId(formationId)
                .scheduledAt(request.scheduledAt())
                .durationMinutes(request.durationMinutes())
                .capacity(request.capacity())
                .status(FormationSessionStatus.SCHEDULED)
                .createdAt(now)
                .updatedAt(now)
                .build();
        return toSessionDto(sessionRepository.save(session));
    }

    @Transactional
    public void deleteSession(User organizer, UUID formationId, UUID sessionId) {
        requireOrganizer(organizer);
        requireOwned(organizer.getId(), formationId);
        FormationSession session = sessionRepository.findByIdAndFormationId(sessionId, formationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        session.setStatus(FormationSessionStatus.CANCELLED);
        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public List<ParticipantDto> participants(User organizer, UUID formationId, UUID sessionId) {
        requireOrganizer(organizer);
        requireOwned(organizer.getId(), formationId);
        sessionRepository.findByIdAndFormationId(sessionId, formationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        List<FormationRegistration> registrations = registrationRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        Map<UUID, User> members = userRepository.findByIdIn(
                registrations.stream().map(FormationRegistration::getMemberId).distinct().toList()
        ).stream().collect(Collectors.toMap(User::getId, u -> u));
        return registrations.stream()
                .filter(r -> r.getStatus() != FormationRegistrationStatus.CANCELLED)
                .map(r -> new ParticipantDto(
                        r.getId(),
                        r.getMemberId(),
                        members.containsKey(r.getMemberId()) ? members.get(r.getMemberId()).getDisplayName() : "Membre",
                        r.getStatus().name(),
                        r.getWaitlistPosition(),
                        r.getCreatedAt()
                ))
                .toList();
    }

    Formation requireOwned(UUID organizerId, UUID id) {
        return formationRepository.findByIdAndOrganizerId(id, organizerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));
    }

    private void validateSessionRequest(UpsertSessionRequest request) {
        if (request.scheduledAt() == null || request.scheduledAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SESSION_DATE_INVALID");
        }
        if (request.durationMinutes() == null || request.durationMinutes() < 15) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SESSION_DURATION_INVALID");
        }
        if (request.capacity() == null || request.capacity() < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SESSION_CAPACITY_INVALID");
        }
    }

    private void apply(Formation formation, UpsertFormationRequest request) {
        String title = request.title() == null ? "" : request.title().trim();
        if (title.isBlank() || title.length() > 160) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FORMATION_TITLE_INVALID");
        }
        FormationContentType contentType = parseContentType(request.contentType());
        formation.setContentType(contentType);
        formation.setTitle(title);
        formation.setTrainerName(blankToNull(request.trainerName()));
        formation.setDescription(blankToNull(request.description()));
        formation.setLanguage(blankToNull(request.language()));
        formation.setLocation(blankToNull(request.location()));
        formation.setOnline(Boolean.TRUE.equals(request.online()));
        formation.setPriceAmount(request.priceAmount() == null ? java.math.BigDecimal.ZERO : request.priceAmount());
        formation.setPriceCurrency(normalizeCurrency(request.priceCurrency()));
        formation.setHasCertification(Boolean.TRUE.equals(request.hasCertification()));
        formation.setImageUploadId(request.imageUploadId());
    }

    private FormationContentType parseContentType(String value) {
        try {
            return FormationContentType.valueOf(value == null ? "" : value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CONTENT_TYPE_INVALID");
        }
    }

    private String normalizeCurrency(String currency) {
        String value = currency == null || currency.isBlank() ? "TND" : currency.trim().toUpperCase();
        if (value.length() != 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CURRENCY_INVALID");
        }
        return value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void requireOrganizer(User user) {
        permissionService.require(user, Permissions.ACADEMY_MANAGE);
    }

    private FormationDto toDto(Formation formation) {
        return new FormationDto(
                formation.getId(),
                formation.getContentType().name(),
                formation.getTitle(),
                formation.getTrainerName(),
                formation.getDescription(),
                formation.getLanguage(),
                formation.getLocation(),
                formation.isOnline(),
                formation.getPriceAmount(),
                formation.getPriceCurrency(),
                formation.isHasCertification(),
                formation.getImageUploadId(),
                formation.isActive(),
                formation.getCreatedAt()
        );
    }

    private FormationSessionDto toSessionDto(FormationSession session) {
        long confirmed = registrationRepository.countBySessionIdAndStatusIn(session.getId(), SEAT_STATUSES);
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
}
