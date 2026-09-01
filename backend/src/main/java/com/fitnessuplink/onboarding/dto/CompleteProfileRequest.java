package com.fitnessuplink.onboarding.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record CompleteProfileRequest(@NotNull Map<String, String> values) {
}
