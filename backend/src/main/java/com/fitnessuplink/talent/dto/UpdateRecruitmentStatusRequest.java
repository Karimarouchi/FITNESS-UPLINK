package com.fitnessuplink.talent.dto;

import com.fitnessuplink.talent.PipelineStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateRecruitmentStatusRequest(@NotNull PipelineStatus status) {
}
