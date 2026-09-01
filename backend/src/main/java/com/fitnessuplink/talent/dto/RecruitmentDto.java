package com.fitnessuplink.talent.dto;

import com.fitnessuplink.jobs.dto.JobOfferSummaryDto;
import com.fitnessuplink.talent.PipelineStatus;

import java.time.Instant;
import java.util.UUID;

public record RecruitmentDto(
        UUID id,
        RecruitmentCandidateDto candidate,
        JobOfferSummaryDto jobOffer,
        boolean directRecruitment,
        PipelineStatus status,
        String internalNote,
        Instant createdAt,
        Instant updatedAt,
        Instant statusUpdatedAt
) {
}
