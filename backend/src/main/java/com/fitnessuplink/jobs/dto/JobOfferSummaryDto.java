package com.fitnessuplink.jobs.dto;

import java.util.UUID;

public record JobOfferSummaryDto(
        UUID id,
        String title,
        String position,
        String location
) {
}
