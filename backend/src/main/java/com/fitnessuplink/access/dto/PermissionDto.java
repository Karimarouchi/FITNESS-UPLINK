package com.fitnessuplink.access.dto;

import java.util.UUID;

public record PermissionDto(
        UUID id,
        String code,
        String module,
        String moduleLabel,
        String label,
        String description,
        int sortOrder
) {
}
