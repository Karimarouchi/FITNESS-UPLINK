package com.fitnessuplink.coaching;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface CoachServiceRepository extends JpaRepository<CoachService, UUID> {
    List<CoachService> findByCoachIdOrderByCreatedAtDesc(UUID coachId);

    List<CoachService> findByCoachIdAndActiveTrueOrderByCreatedAtDesc(UUID coachId);

    Optional<CoachService> findByIdAndCoachId(UUID id, UUID coachId);
}

interface CoachAvailabilityRuleRepository extends JpaRepository<CoachAvailabilityRule, UUID> {
    List<CoachAvailabilityRule> findByCoachIdOrderByDayOfWeekAscStartTimeAsc(UUID coachId);

    Optional<CoachAvailabilityRule> findByIdAndCoachId(UUID id, UUID coachId);
}

interface CoachAvailabilityExceptionRepository extends JpaRepository<CoachAvailabilityException, UUID> {
    List<CoachAvailabilityException> findByCoachIdAndExceptionDateBetween(UUID coachId, LocalDate from, LocalDate to);

    Optional<CoachAvailabilityException> findByIdAndCoachId(UUID id, UUID coachId);
}

interface CoachPackOfferRepository extends JpaRepository<CoachPackOffer, UUID> {
    List<CoachPackOffer> findByCoachIdOrderByCreatedAtDesc(UUID coachId);

    List<CoachPackOffer> findByCoachIdAndActiveTrueOrderByCreatedAtDesc(UUID coachId);

    Optional<CoachPackOffer> findByIdAndCoachId(UUID id, UUID coachId);
}

interface CoachingPackRepository extends JpaRepository<CoachingPack, UUID> {
    List<CoachingPack> findByClientIdOrderByPurchasedAtDesc(UUID clientId);

    List<CoachingPack> findByCoachIdOrderByPurchasedAtDesc(UUID coachId);

    Optional<CoachingPack> findByIdAndClientId(UUID id, UUID clientId);

    List<CoachingPack> findByStatusAndExpiresAtBefore(CoachingPackStatus status, Instant when);

    long countByCoachIdAndStatus(UUID coachId, CoachingPackStatus status);
}

interface CoachingBookingRepository extends JpaRepository<CoachingBooking, UUID> {
    List<CoachingBooking> findByCoachIdOrderByScheduledAtDesc(UUID coachId);

    List<CoachingBooking> findByClientIdOrderByScheduledAtDesc(UUID clientId);

    Optional<CoachingBooking> findByIdAndCoachId(UUID id, UUID coachId);

    Optional<CoachingBooking> findByIdAndClientId(UUID id, UUID clientId);

    List<CoachingBooking> findByCoachIdAndScheduledAtBetween(UUID coachId, Instant from, Instant to);

    List<CoachingBooking> findByStatusAndScheduledAtBefore(CoachingBookingStatus status, Instant when);

    List<CoachingBooking> findByStatusInAndScheduledAtBefore(List<CoachingBookingStatus> statuses, Instant when);

    List<CoachingBooking> findByStatusAndReminderSentAtIsNullAndScheduledAtBetween(
            CoachingBookingStatus status, Instant from, Instant to);

    long countByCoachIdAndStatusAndScheduledAtBetween(UUID coachId, CoachingBookingStatus status, Instant from, Instant to);

    long countByCoachIdAndStatusIn(UUID coachId, List<CoachingBookingStatus> statuses);

    boolean existsByCoachIdAndClientIdAndStatus(UUID coachId, UUID clientId, CoachingBookingStatus status);

    List<CoachingBooking> findByCoachIdAndClientIdAndStatusOrderByScheduledAtDesc(
            UUID coachId, UUID clientId, CoachingBookingStatus status);
}

interface CoachingPaymentRepository extends JpaRepository<CoachingPayment, UUID> {
    List<CoachingPayment> findByClientIdOrderByCreatedAtDesc(UUID clientId);
}

interface CoachingMessageRepository extends JpaRepository<CoachingMessage, UUID> {
    List<CoachingMessage> findByBookingIdOrderByCreatedAtAsc(UUID bookingId);
}

interface CoachingReviewRepository extends JpaRepository<CoachingReview, UUID> {
    List<CoachingReview> findByCoachIdOrderByCreatedAtDesc(UUID coachId);

    Optional<CoachingReview> findByBookingId(UUID bookingId);

    boolean existsByBookingId(UUID bookingId);

    boolean existsByCoachIdAndClientId(UUID coachId, UUID clientId);

    Optional<CoachingReview> findByCoachIdAndClientId(UUID coachId, UUID clientId);
}

interface CoachSettingsRepository extends JpaRepository<CoachSettings, UUID> {
}

interface CoachingPlatformSettingsRepository extends JpaRepository<CoachingPlatformSettings, Short> {
}

interface CoachingReportRepository extends JpaRepository<CoachingReport, UUID> {
    List<CoachingReport> findByStatusOrderByCreatedAtDesc(CoachingReportStatus status);

    List<CoachingReport> findAllByOrderByCreatedAtDesc();

    boolean existsByBookingIdAndStatus(UUID bookingId, CoachingReportStatus status);
}

interface CoachDirectMessageRepository extends JpaRepository<CoachDirectMessage, UUID> {
    List<CoachDirectMessage> findByCoachIdAndMemberIdOrderByCreatedAtAsc(UUID coachId, UUID memberId);

    /** Returns the latest message per distinct member for a given coach (inbox list) */
    @org.springframework.data.jpa.repository.Query(
            "SELECT m FROM CoachDirectMessage m WHERE m.coachId = :coachId " +
            "AND m.createdAt = (SELECT MAX(m2.createdAt) FROM CoachDirectMessage m2 " +
            "WHERE m2.coachId = m.coachId AND m2.memberId = m.memberId) " +
            "ORDER BY m.createdAt DESC"
    )
    List<CoachDirectMessage> findLatestPerMemberByCoachId(@org.springframework.data.repository.query.Param("coachId") UUID coachId);

    /** Returns the latest message per distinct coach for a given member (member inbox) */
    @org.springframework.data.jpa.repository.Query(
            "SELECT m FROM CoachDirectMessage m WHERE m.memberId = :memberId " +
            "AND m.createdAt = (SELECT MAX(m2.createdAt) FROM CoachDirectMessage m2 " +
            "WHERE m2.memberId = m.memberId AND m2.coachId = m.coachId) " +
            "ORDER BY m.createdAt DESC"
    )
    List<CoachDirectMessage> findLatestPerCoachByMemberId(@org.springframework.data.repository.query.Param("memberId") UUID memberId);
}
