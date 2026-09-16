package com.fitnessuplink.audit;

import com.fitnessuplink.audit.dto.AuditDtos.AuditLogEntryDto;
import com.fitnessuplink.audit.dto.AuditDtos.AuditLogPageDto;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Single write point for the admin activity trail (admin_audit_logs). Every call site stays
 * best-effort: a logging failure must never break the business action it is attached to.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public void record(UUID actorId, UUID targetUserId, String action, String entityType, UUID entityId, String metadata) {
        try {
            auditLogRepository.save(AuditLog.builder()
                    .id(UUID.randomUUID())
                    .actorId(actorId)
                    .actorLabel(actorId == null ? "Système" : labelOf(actorId))
                    .targetUserId(targetUserId)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .metadata(metadata)
                    .createdAt(Instant.now())
                    .build());
        } catch (Exception ex) {
            log.warn("event=audit_log_write_failed action={}", action, ex);
        }
    }

    public void recordForUser(UUID actorId, UUID targetUserId, String action) {
        record(actorId, targetUserId, action, "USER", targetUserId, null);
    }

    @Transactional(readOnly = true)
    public AuditLogPageDto activityOf(UUID targetUserId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Page<AuditLog> result = auditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(
                targetUserId,
                PageRequest.of(safePage, safeSize)
        );
        List<AuditLogEntryDto> items = result.getContent().stream()
                .map(row -> new AuditLogEntryDto(
                        row.getId(),
                        row.getAction(),
                        labelFor(row.getAction()),
                        row.getEntityType(),
                        row.getEntityId(),
                        row.getActorLabel(),
                        row.getMetadata(),
                        row.getCreatedAt()
                ))
                .toList();
        return new AuditLogPageDto(items, result.getTotalElements(), safePage, safeSize);
    }

    private String labelOf(UUID userId) {
        return userRepository.findById(userId)
                .map(AuditLogService::displayLabel)
                .orElse("Utilisateur supprimé");
    }

    private static String displayLabel(User user) {
        String name = user.getDisplayName();
        return name != null && !name.isBlank() ? name : user.getEmail();
    }

    private static String labelFor(String action) {
        return switch (action) {
            case AuditAction.LOGIN_SUCCESS -> "Connexion réussie";
            case AuditAction.LOGIN_FAILED -> "Tentative de connexion échouée";
            case AuditAction.ACCOUNT_LOCKED -> "Compte verrouillé (trop d'échecs)";
            case AuditAction.ACCOUNT_BLOCKED -> "Compte bloqué par un admin";
            case AuditAction.ACCOUNT_UNBLOCKED -> "Compte débloqué par un admin";
            case AuditAction.ACCOUNT_DELETED -> "Compte supprimé par un admin";
            case AuditAction.VERIFICATION_ACCEPTED -> "Document vérifié";
            case AuditAction.VERIFICATION_REJECTED -> "Document refusé";
            case AuditAction.SUBSCRIPTION_TRIAL_STARTED -> "Essai gratuit démarré";
            case AuditAction.SUBSCRIPTION_ACTIVATED -> "Abonnement activé";
            case AuditAction.SUBSCRIPTION_RENEWED -> "Abonnement renouvelé";
            case AuditAction.SUBSCRIPTION_CANCELLED -> "Abonnement annulé";
            case AuditAction.SUBSCRIPTION_SUSPENDED -> "Abonnement suspendu (échec de paiement)";
            case AuditAction.SUBSCRIPTION_EXPIRED -> "Abonnement expiré";
            default -> action;
        };
    }
}
