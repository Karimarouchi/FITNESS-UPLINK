package com.fitnessuplink.auth.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.mail")
public record MailProperties(
        String fromName,
        String fromEmail,
        Duration codeTtl,
        Duration resendCooldown,
        int maxAttempts,
        String settingsSecret
) {
    public MailProperties {
        if (fromName == null || fromName.isBlank()) {
            fromName = "Fitness Uplink";
        }
        if (codeTtl == null) {
            codeTtl = Duration.ofMinutes(10);
        }
        if (resendCooldown == null) {
            resendCooldown = Duration.ofSeconds(60);
        }
        if (maxAttempts <= 0) {
            maxAttempts = 5;
        }
        if (settingsSecret == null) {
            settingsSecret = "";
        }
    }
}
