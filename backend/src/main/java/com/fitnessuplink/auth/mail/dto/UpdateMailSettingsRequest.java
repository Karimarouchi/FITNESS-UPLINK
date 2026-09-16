package com.fitnessuplink.auth.mail.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateMailSettingsRequest(
        @NotBlank @Size(max = 120) String fromName,
        @NotBlank @Email @Size(max = 255) String fromEmail,
        @Size(max = 255) String smtpHost,
        @Min(1) @Max(65535) Integer smtpPort,
        @Size(max = 255) String smtpUsername,
        @Size(max = 255) String smtpPassword
) {
}
