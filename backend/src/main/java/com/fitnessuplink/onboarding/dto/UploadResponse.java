package com.fitnessuplink.onboarding.dto;

import java.util.UUID;

public record UploadResponse(
        UUID id,
        String fieldKey,
        String originalFilename,
        String contentType,
        long sizeBytes
) {
}
