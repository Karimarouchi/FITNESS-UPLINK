package com.fitnessuplink.talent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportRecruitmentRequest(
        @NotBlank @Size(max = 800) String reason
) {
}
