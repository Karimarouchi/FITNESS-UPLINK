package com.fitnessuplink.access.dto;

import java.util.List;
import java.util.UUID;

public record RoleAccessDto(
        UUID id,
        String code,
        String label,
        String description,
        String category,
        String categoryLabel,
        boolean selectable,
        boolean locked,
        List<String> permissionCodes
) {
}
