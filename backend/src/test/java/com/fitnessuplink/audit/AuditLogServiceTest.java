package com.fitnessuplink.audit;

import com.fitnessuplink.audit.dto.AuditDtos.AuditLogPageDto;
import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private UserRepository userRepository;

    private AuditLogService service;

    @BeforeEach
    void setUp() {
        service = new AuditLogService(auditLogRepository, userRepository);
    }

    @Test
    void recordResolvesActorDisplayNameAndPersists() {
        UUID actorId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(userRepository.findById(actorId)).thenReturn(Optional.of(user(actorId, "Jane Doe", "jane@example.com")));

        service.record(actorId, targetId, AuditAction.ACCOUNT_BLOCKED, "USER", targetId, "manual review");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog saved = captor.getValue();
        assertEquals(actorId, saved.getActorId());
        assertEquals("Jane Doe", saved.getActorLabel());
        assertEquals(targetId, saved.getTargetUserId());
        assertEquals(AuditAction.ACCOUNT_BLOCKED, saved.getAction());
        assertEquals("manual review", saved.getMetadata());
    }

    @Test
    void recordWithNullActorUsesSystemLabel() {
        UUID targetId = UUID.randomUUID();

        service.record(null, targetId, AuditAction.SUBSCRIPTION_EXPIRED, "SUBSCRIPTION", null, null);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals("Système", captor.getValue().getActorLabel());
    }

    @Test
    void recordNeverThrowsWhenPersistenceFails() {
        lenient().when(auditLogRepository.save(any())).thenThrow(new RuntimeException("db down"));

        assertDoesNotThrow(() -> service.record(null, UUID.randomUUID(), AuditAction.LOGIN_FAILED, "USER", null, null));
    }

    @Test
    void activityOfMapsEntriesToFrenchLabelsAndPagination() {
        UUID targetId = UUID.randomUUID();
        AuditLog entry = AuditLog.builder()
                .id(UUID.randomUUID())
                .actorId(null)
                .actorLabel("Système")
                .targetUserId(targetId)
                .action(AuditAction.SUBSCRIPTION_SUSPENDED)
                .entityType("SUBSCRIPTION")
                .createdAt(Instant.now())
                .build();
        Page<AuditLog> page = new PageImpl<>(List.of(entry));
        when(auditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(any(), any(Pageable.class))).thenReturn(page);

        AuditLogPageDto result = service.activityOf(targetId, 0, 20);

        assertEquals(1, result.items().size());
        assertEquals("Abonnement suspendu (échec de paiement)", result.items().get(0).label());
        assertEquals(1, result.total());
    }

    private User user(UUID id, String displayName, String email) {
        AppRole role = new AppRole();
        role.setId(UUID.randomUUID());
        role.setCode("EMPLOYER");
        return User.builder()
                .id(id)
                .email(email)
                .passwordHash("hash")
                .displayName(displayName)
                .appRole(role)
                .enabled(true)
                .build();
    }
}
