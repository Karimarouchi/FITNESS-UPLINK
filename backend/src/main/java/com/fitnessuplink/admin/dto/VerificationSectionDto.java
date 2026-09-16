package com.fitnessuplink.admin.dto;

import java.util.List;

public record VerificationSectionDto(
        String key,
        String label,
        String hint,
        boolean complete,
        boolean required,
        String reviewStatus,
        String rejectionReason,
        List<String> facts,
        List<VerificationFileDto> files,
        List<VerificationPersonDto> people
) {
}
