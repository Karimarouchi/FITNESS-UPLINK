package com.fitnessuplink.jobs.dto;

import com.fitnessuplink.user.dto.CountrySummary;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OpportunityDto(
        UUID id,
        String title,
        String position,
        String location,
        String contractType,
        String salaryAmount,
        String salaryCurrency,
        List<String> languages,
        List<String> certifications,
        String experience,
        String description,
        String employerName,
        CountrySummary employerCountry,
        boolean applied,
        Instant expiresAt,
        Instant createdAt
) {
}
