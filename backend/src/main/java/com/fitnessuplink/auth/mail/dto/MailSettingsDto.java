package com.fitnessuplink.auth.mail.dto;

public record MailSettingsDto(
        String fromName,
        String fromEmail,
        String smtpHost,
        Integer smtpPort,
        String smtpUsername,
        boolean passwordConfigured,
        boolean usingEnvSmtp
) {
}
