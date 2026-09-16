package com.fitnessuplink.auth.recaptcha;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.recaptcha")
public record RecaptchaProperties(
        String secret,
        Double minScore
) {
    public RecaptchaProperties {
        if (minScore == null) {
            minScore = 0.5;
        }
    }

    public boolean enabled() {
        return secret != null && !secret.isBlank();
    }
}
