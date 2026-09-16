package com.fitnessuplink.talent.dto;

import com.fitnessuplink.contracts.dto.ContractSummaryDto;
import com.fitnessuplink.jobs.dto.JobOfferSummaryDto;
import com.fitnessuplink.talent.PipelineStatus;

import java.time.Instant;
import java.util.UUID;

public record RecruitmentDto(
        UUID id,
        RecruitmentCandidateDto candidate,
        RecruitmentEmployerDto employer,
        JobOfferSummaryDto jobOffer,
        boolean directRecruitment,
        PipelineStatus status,
        String internalNote,
        Instant createdAt,
        Instant updatedAt,
        Instant statusUpdatedAt,
        ContractSummaryDto contract,
        String coverLetterText,
        FileRef coverLetterFile,
        FileRef cvFile,
        Instant interviewAt,
        String interviewMode,
        String interviewPlace
) {
}
