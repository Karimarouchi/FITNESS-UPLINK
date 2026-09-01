package com.fitnessuplink.user.dto;

import java.util.UUID;

public record CountrySummary(
        UUID id,
        String iso2,
        String name,
        String flagEmoji,
        String callingCode
) {
}
