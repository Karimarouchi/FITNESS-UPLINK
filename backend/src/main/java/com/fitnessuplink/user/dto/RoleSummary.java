package com.fitnessuplink.user.dto;

import java.util.UUID;

public record RoleSummary(
        UUID id,
        String code,
        String label,
        String category,
        String categoryLabel,
        String icon
) {
}
