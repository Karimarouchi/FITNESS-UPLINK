package com.fitnessuplink.talent.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateRecruitmentRequest(
        @NotNull UUID candidateId,
        UUID jobOfferId,
        String internalNote
) {
}
