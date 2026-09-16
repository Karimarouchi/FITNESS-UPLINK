package com.fitnessuplink.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "admin_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {
    @Id
    private UUID id;
    @Column(name = "actor_id")
    private UUID actorId;
    @Column(name = "actor_label", length = 160)
    private String actorLabel;
    @Column(name = "target_user_id")
    private UUID targetUserId;
    @Column(nullable = false, length = 64)
    private String action;
    @Column(name = "entity_type", length = 32)
    private String entityType;
    @Column(name = "entity_id")
    private UUID entityId;
    @Column(columnDefinition = "TEXT")
    private String metadata;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
