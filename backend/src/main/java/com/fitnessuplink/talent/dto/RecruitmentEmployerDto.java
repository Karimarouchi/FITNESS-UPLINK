package com.fitnessuplink.talent.dto;

import com.fitnessuplink.user.dto.CountrySummary;

import java.util.UUID;

public record RecruitmentEmployerDto(
        UUID id,
        String displayName,
        CountrySummary country
) {
}
