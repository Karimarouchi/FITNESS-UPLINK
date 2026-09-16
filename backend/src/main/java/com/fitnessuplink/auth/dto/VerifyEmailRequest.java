package com.fitnessuplink.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyEmailRequest(
        @NotBlank
        @Pattern(regexp = "^\\d{6}$", message = "Enter the 6-digit code")
        String code
) {
}
