package com.fitnessuplink.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.security")
public record SecurityProperties(
        Jwt jwt,
        RefreshToken refreshToken,
        Cookie cookie,
        Lockout lockout,
        SuperAdmin superAdmin
) {
    public record Jwt(String secret, Duration accessTokenTtl) {
    }

    public record RefreshToken(
            String cookieName,
            String cookiePath,
            Duration ttl,
            Duration rememberMeTtl
    ) {
    }

    public record Cookie(boolean secure) {
    }

    public record Lockout(int maxAttempts, Duration duration) {
    }

    public record SuperAdmin(String email, String password, String firstName, String lastName) {
    }
}
