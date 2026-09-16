package com.fitnessuplink.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateVerificationCheckRequest(
        @NotBlank String status,
        @Size(max = 500) String reason
) {
}
