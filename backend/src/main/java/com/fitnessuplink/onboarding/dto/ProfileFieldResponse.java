package com.fitnessuplink.onboarding.dto;

import java.util.List;

public record ProfileFieldResponse(
        String fieldKey,
        String label,
        String fieldType,
        String placeholder,
        List<SelectOption> options,
        List<ItemField> itemFields,
        boolean required,
        Integer maxLength,
        int sortOrder,
        String sectionKey,
        String sectionLabel,
        String sectionIcon,
        String helpText,
        String accept,
        boolean visibilityRequired
) {
}
