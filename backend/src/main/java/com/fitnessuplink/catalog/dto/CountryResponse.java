package com.fitnessuplink.catalog.dto;

import java.util.UUID;

public record CountryResponse(
        UUID id,
        String iso2,
        String name,
        String flagEmoji,
        String callingCode
) {
}
