package com.fitnessuplink.contracts.signature;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.signature")
public record SignatureProperties(
        String provider,
        String webhookSecret,
        boolean failSend
) {
    public SignatureProperties {
        if (provider == null || provider.isBlank()) {
            provider = "mock";
        }
        if (webhookSecret == null || webhookSecret.isBlank()) {
            webhookSecret = "fitness-uplink-local-webhook-secret";
        }
    }
}
