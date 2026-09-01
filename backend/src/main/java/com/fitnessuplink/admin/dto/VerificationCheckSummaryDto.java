package com.fitnessuplink.admin.dto;

public record VerificationCheckSummaryDto(
        String key,
        String label,
        boolean complete,
        boolean required,
        String reviewStatus
) {
}
