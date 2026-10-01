package com.fitnessuplink.jobs.dto;

import com.fitnessuplink.user.dto.CountrySummary;

import java.time.Instant;
import java.util.UUID;

public record OpportunityPreviewDto(
        UUID id,
        String title,
        String position,
        String location,
        String contractType,
        String employerName,
        CountrySummary employerCountry,
        Instant createdAt
) {
}
