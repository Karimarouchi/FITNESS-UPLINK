package com.fitnessuplink.onboarding.dto;

import java.util.List;

public record ItemField(
        String key,
        String label,
        String type,
        boolean required,
        List<SelectOption> options
) {
}
