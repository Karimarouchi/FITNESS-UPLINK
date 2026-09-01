package com.fitnessuplink.admin.dto;

import com.fitnessuplink.user.dto.CountrySummary;
import com.fitnessuplink.user.dto.RoleSummary;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record VerificationAccountDto(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String displayName,
        RoleSummary role,
        CountrySummary country,
        boolean onboardingCompleted,
        Instant createdAt,
        UUID avatarUploadId,
        String verificationStatus,
        String kind,
        List<VerificationCheckSummaryDto> checks
) {
}
