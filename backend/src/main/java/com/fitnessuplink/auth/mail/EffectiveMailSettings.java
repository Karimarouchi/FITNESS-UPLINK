package com.fitnessuplink.auth.mail;

public record EffectiveMailSettings(
        String fromName,
        String fromEmail,
        String host,
        int port,
        String username,
        String password,
        boolean passwordConfigured,
        boolean usingEnvSmtp
) {
}
