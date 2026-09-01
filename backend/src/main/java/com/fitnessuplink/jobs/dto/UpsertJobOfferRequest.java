package com.fitnessuplink.jobs.dto;

import com.fitnessuplink.jobs.JobOfferStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record UpsertJobOfferRequest(
        @NotBlank @Size(max = 160) String title,
        @Size(max = 160) String position,
        @Size(max = 160) String location,
        @Size(max = 32) String contractType,
        @Size(max = 32) String salaryAmount,
        @Size(max = 8) String salaryCurrency,
        List<String> languages,
        List<String> certifications,
        @Size(max = 160) String experience,
        String description,
        JobOfferStatus status,
        Instant expiresAt
) {
}
