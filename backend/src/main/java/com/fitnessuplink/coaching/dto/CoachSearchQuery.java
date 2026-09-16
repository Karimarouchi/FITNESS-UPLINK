package com.fitnessuplink.coaching.dto;

import java.util.UUID;

public record CoachSearchQuery(
        String q,
        UUID countryId,
        String city,
        String specialty,
        String sort,
        int page,
        int size
) {
    public static CoachSearchQuery of(
            String q,
            UUID countryId,
            String city,
            String specialty,
            String sort,
            int page,
            int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        String normalizedSort = sort == null ? "recent" : sort.trim().toLowerCase();
        String safeSort = switch (normalizedSort) {
            case "rating", "name", "recent" -> normalizedSort;
            default -> "recent";
        };
        return new CoachSearchQuery(
                blankToNull(q),
                countryId,
                blankToNull(city),
                blankToNull(specialty),
                safeSort,
                safePage,
                safeSize
        );
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
