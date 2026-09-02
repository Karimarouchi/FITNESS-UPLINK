package com.fitnessuplink.contracts.dto;

import java.time.Instant;
import java.util.UUID;

public record ContractHistoryDto(
        UUID id,
        String event,
        UUID actorId,
        String actorType,
        String previousStatus,
        String newStatus,
        Instant createdAt
) {
}
