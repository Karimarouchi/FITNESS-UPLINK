package com.fitnessuplink.onboarding.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SelectPlanRequest(
        @NotBlank
        String plan,
        @NotBlank
        @Pattern(regexp = "MONTHLY|YEARLY")
        String interval
) {
}
