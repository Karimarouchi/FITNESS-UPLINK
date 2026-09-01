package com.fitnessuplink.jobs.dto;

import com.fitnessuplink.jobs.JobOfferStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record JobOfferDto(
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
        JobOfferStatus status,
        Instant expiresAt,
        Instant createdAt,
        Instant updatedAt
) {
}
