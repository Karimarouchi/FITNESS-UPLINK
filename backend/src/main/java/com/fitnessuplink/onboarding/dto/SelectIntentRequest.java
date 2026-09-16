package com.fitnessuplink.onboarding.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SelectIntentRequest(
        @NotBlank
        @Pattern(regexp = "JOB|COACHING|BOTH")
        String intent
) {
}
