package com.fitnessuplink.academy;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface FormationRepository extends JpaRepository<Formation, UUID> {
    List<Formation> findByOrganizerIdOrderByCreatedAtDesc(UUID organizerId);

    Optional<Formation> findByIdAndOrganizerId(UUID id, UUID organizerId);

    @Query("""
            SELECT f.id FROM Formation f
            WHERE f.active = TRUE
              AND (:contentType IS NULL OR f.contentType = :contentType)
              AND (:q = ''
                   OR LOWER(f.title) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(f.trainerName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(f.description, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY f.createdAt DESC
            """)
    Page<UUID> search(@Param("contentType") FormationContentType contentType, @Param("q") String q, Pageable pageable);
}

interface FormationSessionRepository extends JpaRepository<FormationSession, UUID> {
    List<FormationSession> findByFormationIdOrderByScheduledAtAsc(UUID formationId);

    List<FormationSession> findByFormationIdInOrderByScheduledAtAsc(List<UUID> formationIds);

    Optional<FormationSession> findByIdAndFormationId(UUID id, UUID formationId);

    List<FormationSession> findByStatusAndScheduledAtBefore(FormationSessionStatus status, Instant when);

    /** Row lock on the session so seat checks (register / pay) can't race each other. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM FormationSession s WHERE s.id = :id")
    Optional<FormationSession> findByIdForUpdate(@Param("id") UUID id);
}

interface FormationRegistrationRepository extends JpaRepository<FormationRegistration, UUID> {
    List<FormationRegistration> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    List<FormationRegistration> findByMemberIdOrderByCreatedAtDesc(UUID memberId);

    Optional<FormationRegistration> findByIdAndMemberId(UUID id, UUID memberId);

    long countBySessionIdAndStatusIn(UUID sessionId, List<FormationRegistrationStatus> statuses);

    /** Seats held: paid / free, promised on site, or an online payment still inside its 5-minute hold. */
    @Query("""
            SELECT COUNT(r) FROM FormationRegistration r WHERE r.sessionId = :sessionId AND (
              r.status IN (com.fitnessuplink.academy.FormationRegistrationStatus.CONFIRMED,
                           com.fitnessuplink.academy.FormationRegistrationStatus.PENDING_ON_SITE)
              OR (r.status = com.fitnessuplink.academy.FormationRegistrationStatus.PENDING_PAYMENT AND r.holdExpiresAt > :now))
            """)
    long countSeatsTaken(@Param("sessionId") UUID sessionId, @Param("now") Instant now);

    Optional<FormationRegistration> findByTicketToken(String ticketToken);

    List<FormationRegistration> findByStatusAndHoldExpiresAtBefore(FormationRegistrationStatus status, Instant when);

    List<FormationRegistration> findBySessionIdAndStatus(UUID sessionId, FormationRegistrationStatus status);

    boolean existsByMemberIdAndStatusAndPaymentIdIsNull(UUID memberId, FormationRegistrationStatus status);

    List<FormationRegistration> findByMemberIdAndStatusAndPaymentIdIsNull(UUID memberId, FormationRegistrationStatus status);

    List<FormationRegistration> findBySessionIdAndStatusOrderByCreatedAtAsc(UUID sessionId, FormationRegistrationStatus status);

    List<FormationRegistration> findByStatus(FormationRegistrationStatus status);
}

interface FormationPaymentRepository extends JpaRepository<FormationPayment, UUID> {
}
