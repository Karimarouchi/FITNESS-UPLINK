package com.fitnessuplink.talent.dto;

import java.util.UUID;

public record CandidateSearchQuery(
        String q,
        UUID countryId,
        String city,
        String title,
        String specialty,
        String availability,
        String contractType,
        String language,
        Boolean relocate,
        Boolean hasDiploma,
        Boolean hasCertification,
        String sort,
        int page,
        int size
) {
    public static CandidateSearchQuery of(
            String q,
            UUID countryId,
            String city,
            String title,
            String specialty,
            String availability,
            String contractType,
            String language,
            Boolean relocate,
            Boolean hasDiploma,
            Boolean hasCertification,
            String sort,
            int page,
            int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        String safeSort = switch (sort == null ? "date" : sort.trim().toLowerCase()) {
            case "relevance", "experience", "date" -> sort.trim().toLowerCase();
            default -> "date";
        };
        return new CandidateSearchQuery(
                blankToNull(q),
                countryId,
                blankToNull(city),
                blankToNull(title),
                blankToNull(specialty),
                blankToNull(availability),
                blankToNull(contractType),
                blankToNull(language),
                relocate,
                hasDiploma,
                hasCertification,
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
