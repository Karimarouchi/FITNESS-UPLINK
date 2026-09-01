package com.fitnessuplink.talent.dto;

import com.fitnessuplink.user.dto.CountrySummary;

import java.util.List;
import java.util.UUID;

public record CandidateCardResponse(
        UUID id,
        String firstName,
        String lastName,
        String displayName,
        String title,
        String city,
        CountrySummary country,
        List<String> specialties,
        List<ExperienceItem> experiences,
        String availability,
        String availabilityLabel,
        UUID photoUploadId,
        boolean verified,
        boolean favorite,
        boolean inPipeline,
        String pipelineStatus,
        UUID recruitmentId,
        String email
) {
}
