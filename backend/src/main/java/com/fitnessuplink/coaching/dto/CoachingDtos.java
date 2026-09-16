package com.fitnessuplink.coaching.dto;

import com.fitnessuplink.user.dto.CountrySummary;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public final class CoachingDtos {
    private CoachingDtos() {
    }

    public record CoachServiceDto(
            UUID id,
            String name,
            String description,
            int durationMinutes,
            BigDecimal priceAmount,
            String priceCurrency,
            boolean active
    ) {
    }

    public record UpsertCoachServiceRequest(
            String name,
            String description,
            Integer durationMinutes,
            BigDecimal priceAmount,
            String priceCurrency,
            Boolean active
    ) {
    }

    public record AvailabilityRuleDto(UUID id, int dayOfWeek, LocalTime startTime, LocalTime endTime, boolean active) {
    }

    public record UpsertAvailabilityRuleRequest(Integer dayOfWeek, LocalTime startTime, LocalTime endTime) {
    }

    public record AvailabilityExceptionDto(UUID id, LocalDate date, LocalTime startTime, LocalTime endTime, String note) {
    }

    public record CreateAvailabilityExceptionRequest(LocalDate date, LocalTime startTime, LocalTime endTime, String note) {
    }

    public record TimeSlotDto(Instant start, Instant end, boolean available) {
    }

    public record NextAvailableDto(LocalDate date) {
    }

    public record PayBookingRequest(String cardNumber) {
    }

    public record DeclineBookingRequest(List<Instant> suggestedSlots) {
    }

    public record CoachPackOfferDto(
            UUID id,
            String packType,
            Integer sessionCount,
            BigDecimal priceAmount,
            String priceCurrency,
            Integer validityDays,
            boolean active
    ) {
    }

    public record UpsertPackOfferRequest(
            String packType,
            Integer sessionCount,
            BigDecimal priceAmount,
            String priceCurrency,
            Integer validityDays,
            Boolean active
    ) {
    }

    public record CoachCardDto(
            UUID id,
            String displayName,
            String title,
            String city,
            CountrySummary country,
            List<String> specialties,
            UUID photoUploadId,
            double averageRating,
            long reviewCount,
            BigDecimal fromPriceAmount,
            String fromPriceCurrency
    ) {
    }

    public record CoachPageDto(List<CoachCardDto> items, long total, int page, int size) {
    }

    public record ReviewDto(UUID id, String clientDisplayName, int rating, String comment, Instant createdAt) {
    }

    public record TopCoachDto(
            UUID id,
            String displayName,
            String title,
            String city,
            CountrySummary country,
            List<String> specialties,
            UUID photoUploadId,
            double averageRating,
            long reviewCount,
            ReviewDto highlightReview
    ) {
    }

    public record CoachProfileDto(
            UUID id,
            String displayName,
            String title,
            String biography,
            String city,
            CountrySummary country,
            List<String> specialties,
            UUID photoUploadId,
            double averageRating,
            long reviewCount,
            List<CoachServiceDto> services,
            List<ReviewDto> reviews,
            boolean canReview,
            Integer myRating
    ) {
    }

    public record CreateBookingRequest(
            UUID coachServiceId,
            Instant scheduledAt,
            UUID packId,
            String cardNumber
    ) {
    }

    public record BookingDto(
            UUID id,
            UUID coachId,
            String coachDisplayName,
            UUID clientId,
            String clientDisplayName,
            UUID coachServiceId,
            String serviceName,
            Instant scheduledAt,
            int durationMinutes,
            String status,
            BigDecimal priceAmount,
            String priceCurrency,
            UUID packId,
            boolean reviewed,
            Instant createdAt,
            List<Instant> suggestedSlots
    ) {
    }

    public record CancelBookingRequest(String reason) {
    }

    public record PurchasePackRequest(UUID offerId, String cardNumber) {
    }

    public record CoachingPackDto(
            UUID id,
            UUID coachId,
            String coachDisplayName,
            UUID offerId,
            String packType,
            int sessionsTotal,
            int sessionsUsed,
            int sessionsRemaining,
            BigDecimal priceAmount,
            String priceCurrency,
            String status,
            Instant purchasedAt,
            Instant expiresAt
    ) {
    }

    public record MessageDto(UUID id, UUID senderId, String senderDisplayName, String body, UUID uploadId, Instant createdAt) {
    }

    public record SendMessageRequest(String body, UUID uploadId) {
    }

    public record SubmitReviewRequest(Integer rating, String comment) {
    }

    public record CoachAgendaSummaryDto(
            long sessionsThisWeek,
            long activeClients,
            long activePacks,
            double averageRating,
            long pendingRequests
    ) {
    }

    public record CoachSettingsDto(int cancellationDeadlineHours) {
    }

    public record UpdateCoachSettingsRequest(Integer cancellationDeadlineHours) {
    }

    public record PlatformSettingsDto(BigDecimal commissionRate) {
    }

    public record UpdatePlatformSettingsRequest(BigDecimal commissionRate) {
    }

    public record DirectMessageDto(UUID id, UUID senderId, String senderDisplayName, String body, Instant createdAt) {
    }

    public record CoachInboxItemDto(UUID memberId, String memberDisplayName, String lastBody, Instant lastAt) {
    }

    public record MemberInboxItemDto(UUID coachId, String coachDisplayName, String lastBody, Instant lastAt) {
    }

    public record SendDirectMessageRequest(String body) {
    }

    public record ReportBookingRequest(String reason) {
    }

    public record CoachingReportDto(
            UUID id,
            UUID bookingId,
            String reporterDisplayName,
            String reason,
            String status,
            String adminNote,
            Instant createdAt,
            Instant resolvedAt
    ) {
    }

    public record ResolveReportRequest(String adminNote) {
    }

    public record AdminCoachSummaryDto(
            UUID id,
            String displayName,
            String email,
            String city,
            boolean profileVisible,
            long servicesCount,
            long bookingsCount,
            double averageRating
    ) {
    }
}
