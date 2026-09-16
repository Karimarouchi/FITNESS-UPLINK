package com.fitnessuplink.academy.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AcademyDtos {

    private AcademyDtos() {
    }

    public record UpsertFormationRequest(
            String contentType,
            String title,
            String trainerName,
            String description,
            String language,
            String location,
            Boolean online,
            BigDecimal priceAmount,
            String priceCurrency,
            Boolean hasCertification,
            UUID imageUploadId
    ) {
    }

    public record OrganizerSummaryDto(UUID id, String name, UUID logoUploadId, String city) {
    }

    public record FormationDto(
            UUID id,
            String contentType,
            String title,
            String trainerName,
            String description,
            String language,
            String location,
            boolean online,
            BigDecimal priceAmount,
            String priceCurrency,
            boolean hasCertification,
            UUID imageUploadId,
            boolean active,
            Instant createdAt
    ) {
    }

    public record FormationCardDto(
            UUID id,
            String contentType,
            String title,
            String trainerName,
            String language,
            String location,
            boolean online,
            BigDecimal priceAmount,
            String priceCurrency,
            boolean hasCertification,
            UUID imageUploadId,
            OrganizerSummaryDto organizer,
            Instant nextSessionAt,
            Integer nextSessionSeatsLeft
    ) {
    }

    public record FormationPageDto(List<FormationCardDto> items, long total, int page, int size) {
    }

    public record FormationSessionDto(
            UUID id,
            UUID formationId,
            Instant scheduledAt,
            int durationMinutes,
            int capacity,
            int confirmedCount,
            int seatsLeft,
            String status
    ) {
    }

    public record FormationDetailDto(FormationCardDto formation, String description, List<FormationSessionDto> sessions) {
    }

    public record UpsertSessionRequest(Instant scheduledAt, Integer durationMinutes, Integer capacity) {
    }

    public record RegistrationDto(
            UUID id,
            UUID sessionId,
            UUID formationId,
            String formationTitle,
            Instant scheduledAt,
            String status,
            Integer waitlistPosition,
            BigDecimal priceAmount,
            String priceCurrency,
            Instant createdAt
    ) {
    }

    public record PayRegistrationRequest(String cardNumber) {
    }

    public record ParticipantDto(
            UUID registrationId,
            UUID memberId,
            String memberDisplayName,
            String status,
            Integer waitlistPosition,
            Instant createdAt
    ) {
    }
}
