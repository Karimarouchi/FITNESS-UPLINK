package com.fitnessuplink.contracts.signature.dto;

import jakarta.validation.constraints.NotBlank;

public record SignatureWebhookRequest(
        @NotBlank String provider,
        @NotBlank String externalId,
        @NotBlank String event
) {
}
