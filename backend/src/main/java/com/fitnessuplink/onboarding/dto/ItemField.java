package com.fitnessuplink.onboarding.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record ItemField(
        @JsonProperty("key") String key,
        String label,
        String type,
        boolean required,
        List<SelectOption> options
) {
}
