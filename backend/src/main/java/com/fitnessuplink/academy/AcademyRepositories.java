package com.fitnessuplink.academy;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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
}

interface FormationRegistrationRepository extends JpaRepository<FormationRegistration, UUID> {
    List<FormationRegistration> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    List<FormationRegistration> findByMemberIdOrderByCreatedAtDesc(UUID memberId);

    Optional<FormationRegistration> findByIdAndMemberId(UUID id, UUID memberId);

    long countBySessionIdAndStatusIn(UUID sessionId, List<FormationRegistrationStatus> statuses);

    List<FormationRegistration> findBySessionIdAndStatusOrderByCreatedAtAsc(UUID sessionId, FormationRegistrationStatus status);

    List<FormationRegistration> findByStatus(FormationRegistrationStatus status);
}

interface FormationPaymentRepository extends JpaRepository<FormationPayment, UUID> {
}
