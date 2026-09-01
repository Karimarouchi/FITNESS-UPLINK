package com.fitnessuplink.catalog.dto;

import java.util.UUID;

public record RoleCardResponse(
        UUID id,
        String code,
        String label,
        String description,
        String category,
        String categoryLabel,
        String icon,
        int sortOrder
) {
}
