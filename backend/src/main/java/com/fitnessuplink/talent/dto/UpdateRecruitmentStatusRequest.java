package com.fitnessuplink.talent.dto;

import com.fitnessuplink.talent.PipelineStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateRecruitmentStatusRequest(
        @NotNull PipelineStatus status,
        String interviewAt,
        @Size(max = 16) String interviewMode,
        @Size(max = 400) String interviewPlace
) {
}
