package com.fitnessuplink.talent.dto;

import java.util.UUID;

public record ApplyOpportunityRequest(
        String coverLetter,
        UUID coverLetterUploadId
) {
}
