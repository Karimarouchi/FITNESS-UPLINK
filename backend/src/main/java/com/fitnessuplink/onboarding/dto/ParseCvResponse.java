package com.fitnessuplink.onboarding.dto;

import java.util.List;
import java.util.Map;

public record ParseCvResponse(
        Map<String, String> values,
        List<String> filledKeys,
        String message
) {
}
