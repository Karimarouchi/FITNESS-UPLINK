package com.fitnessuplink.audit.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AuditDtos {
    private AuditDtos() {
    }

    public record AuditLogEntryDto(
            UUID id,
            String action,
            String label,
            String entityType,
            UUID entityId,
            String actorLabel,
            String metadata,
            Instant createdAt
    ) {
    }

    public record AuditLogPageDto(
            List<AuditLogEntryDto> items,
            long total,
            int page,
            int size
    ) {
    }
}
