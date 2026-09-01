package com.fitnessuplink.talent.dto;

import com.fitnessuplink.user.dto.CountrySummary;

import java.util.List;
import java.util.UUID;

public record CandidateDetailResponse(
        UUID id,
        String firstName,
        String lastName,
        String displayName,
        String title,
        String biography,
        String city,
        CountrySummary country,
        List<String> specialties,
        List<ExperienceItem> experiences,
        List<LanguageItem> languages,
        List<FileRef> certifications,
        List<FileRef> diplomas,
        String availability,
        String availabilityLabel,
        MoneyValue salary,
        UUID photoUploadId,
        boolean verified,
        boolean favorite,
        List<RecruitmentSummaryDto> recruitments,
        String email,
        String phone,
        FileRef cv,
        List<FileRef> videos,
        boolean canViewMedia
) {
}
