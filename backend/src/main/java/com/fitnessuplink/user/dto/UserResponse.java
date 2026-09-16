package com.fitnessuplink.user.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String displayName,
        RoleSummary role,
        CountrySummary country,
        boolean onboardingCompleted,
        OnboardingStep onboardingStep,
        Instant createdAt,
        UUID avatarUploadId,
        String verificationStatus,
        boolean enabled,
        List<String> permissions,
        String professionalIntent,
        boolean profileVisible,
        boolean emailVerified,
        String selectedPlan,
        String selectedPlanInterval,
        String pendingPlan,
        String pendingPlanInterval
) {
}
