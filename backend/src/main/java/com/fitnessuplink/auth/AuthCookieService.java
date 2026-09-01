package com.fitnessuplink.auth;

import com.fitnessuplink.auth.config.SecurityProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class AuthCookieService {

    private final SecurityProperties properties;

    public AuthCookieService(SecurityProperties properties) {
        this.properties = properties;
    }

    public ResponseCookie createRefreshCookie(String rawToken, Duration maxAge) {
        return baseCookie(rawToken)
                .maxAge(maxAge)
                .build();
    }

    public ResponseCookie clearRefreshCookie() {
        return baseCookie("")
                .maxAge(Duration.ZERO)
                .build();
    }

    public <T> ResponseEntity<T> withRefreshCookie(T body, ResponseCookie cookie) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(body);
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        return ResponseCookie.from(properties.refreshToken().cookieName(), value)
                .httpOnly(true)
                .secure(properties.cookie().secure())
                .sameSite("Lax")
                .path(properties.refreshToken().cookiePath());
    }
}
