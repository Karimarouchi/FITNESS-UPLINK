package com.fitnessuplink.talent.dto;

import com.fitnessuplink.user.dto.CountrySummary;

import java.util.UUID;

public record RecruitmentCandidateDto(
        UUID id,
        String firstName,
        String lastName,
        String displayName,
        String title,
        String city,
        CountrySummary country,
        UUID photoUploadId,
        boolean verified,
        String email
) {
}
