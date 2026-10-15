package com.fitnessuplink.contracts.dto;

import com.fitnessuplink.contracts.ContractSource;
import com.fitnessuplink.contracts.ContractStatus;
import com.fitnessuplink.jobs.dto.JobOfferSummaryDto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ContractDto(
        UUID id,
        UUID recruitmentId,
        UUID employerId,
        UUID candidateId,
        String title,
        ContractStatus status,
        ContractSource source,
        String employerName,
        String candidateName,
        String candidateEmail,
        String employerEmail,
        JobOfferSummaryDto jobOffer,
        boolean directRecruitment,
        ContractTermsDto terms,
        String originalFileName,
        UUID originalUploadId,
        UUID signedUploadId,
        UUID auditTrailUploadId,
        boolean legalTemplateValidated,
        String templateNotice,
        List<ContractSignerDto> signers,
        Instant createdAt,
        Instant sentAt,
        Instant candidateSignedAt,
        Instant employerSignedAt,
        Instant completedAt,
        UUID candidateUploadId
) {
}
