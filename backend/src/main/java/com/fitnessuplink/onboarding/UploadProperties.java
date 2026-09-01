package com.fitnessuplink.onboarding;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.uploads")
public record UploadProperties(String dir, long maxBytes) {
}
