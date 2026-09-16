package com.fitnessuplink.auth.mail.dto;

import jakarta.validation.constraints.Size;

public record UpdateUserMailPrefsRequest(
        @Size(max = 16) String sendMode,
        @Size(max = 200) String contactSubject,
        @Size(max = 4000) String contactBody,
        @Size(max = 200) String messageSubject,
        @Size(max = 4000) String messageBody,
        @Size(max = 120) String fromName,
        @Size(max = 255) String fromEmail,
        @Size(max = 255) String smtpHost,
        Integer smtpPort,
        @Size(max = 255) String smtpUsername,
        String smtpPassword
) {
}
