package com.fitnessuplink.contracts.dto;

import com.fitnessuplink.contracts.ContractStatus;

import java.time.Instant;
import java.util.UUID;

public record ContractSummaryDto(
        UUID id,
        ContractStatus status,
        boolean candidateSigned,
        boolean employerSigned,
        boolean completed,
        Instant sentAt
) {
}
