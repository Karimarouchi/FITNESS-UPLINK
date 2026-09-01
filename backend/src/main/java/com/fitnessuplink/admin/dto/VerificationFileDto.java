package com.fitnessuplink.admin.dto;

import java.util.UUID;

public record VerificationFileDto(
        UUID id,
        String name,
        String contentType,
        long size
) {
}
