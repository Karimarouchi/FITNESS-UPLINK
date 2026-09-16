package com.fitnessuplink.services.dto;

import java.util.UUID;

public record ProviderSearchQuery(
        String q,
        UUID countryId,
        UUID categoryId,
        int page,
        int size
) {
    public static ProviderSearchQuery of(String q, UUID countryId, UUID categoryId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        return new ProviderSearchQuery(blankToNull(q), countryId, categoryId, safePage, safeSize);
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
