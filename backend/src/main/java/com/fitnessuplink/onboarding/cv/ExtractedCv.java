package com.fitnessuplink.onboarding.cv;

import java.util.List;
import java.util.Map;

public record ExtractedCv(
        String firstName,
        String lastName,
        String phone,
        String city,
        String professionalTitle,
        String biography,
        List<String> specialties,
        List<String> skills,
        List<Map<String, String>> experiences,
        List<Map<String, String>> languages,
        String salaryAmount,
        String salaryCurrency,
        List<String> contractTypes,
        String availability
) {
    public static ExtractedCv empty() {
        return new ExtractedCv(
                null, null, null, null, null, null,
                List.of(), List.of(), List.of(), List.of(),
                null, null, List.of(), null
        );
    }

    public boolean hasAnything() {
        return firstName != null
                || lastName != null
                || phone != null
                || city != null
                || professionalTitle != null
                || biography != null
                || !specialties.isEmpty()
                || !skills.isEmpty()
                || !experiences.isEmpty()
                || !languages.isEmpty()
                || salaryAmount != null
                || !contractTypes.isEmpty()
                || availability != null;
    }
}
