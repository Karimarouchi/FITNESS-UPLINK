package com.fitnessuplink.talent.dto;

import com.fitnessuplink.jobs.dto.JobOfferSummaryDto;
import com.fitnessuplink.talent.PipelineStatus;

import java.time.Instant;
import java.util.UUID;

public record RecruitmentSummaryDto(
        UUID id,
        PipelineStatus status,
        JobOfferSummaryDto jobOffer,
        boolean directRecruitment,
        Instant createdAt,
        Instant statusUpdatedAt
) {
}
