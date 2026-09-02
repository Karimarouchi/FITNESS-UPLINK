package com.fitnessuplink.contracts.dto;

import com.fitnessuplink.contracts.ContractSignerRole;

import java.time.Instant;
import java.util.UUID;

public record ContractSignerDto(
        UUID id,
        UUID userId,
        ContractSignerRole role,
        String displayName,
        String email,
        int signingOrder,
        Instant signedAt
) {
}
