package com.fitnessuplink.auth.mail.dto;

public record UserMailPrefsDto(
        String sendMode,
        String contactSubject,
        String contactBody,
        String messageSubject,
        String messageBody,
        String fromName,
        String fromEmail,
        String smtpHost,
        Integer smtpPort,
        String smtpUsername,
        boolean passwordConfigured
) {
}
