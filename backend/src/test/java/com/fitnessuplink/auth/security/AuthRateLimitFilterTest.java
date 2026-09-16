package com.fitnessuplink.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Regression test: the rate limiter must key attempts on the real socket peer address,
 * never on the attacker-controlled X-Forwarded-For header (there is no trusted reverse
 * proxy in front of this app that would sanitize it), otherwise brute-force protection
 * on login/signup/reset-password can be bypassed by sending a fresh header on every request.
 */
class AuthRateLimitFilterTest {

    private final AuthRateLimitFilter filter = new AuthRateLimitFilter();

    @Test
    void ignoresAttackerSuppliedForwardedForHeader() {
        HttpServletRequest first = mock(HttpServletRequest.class);
        when(first.getRemoteAddr()).thenReturn("203.0.113.7");
        when(first.getHeader("X-Forwarded-For")).thenReturn("1.1.1.1");

        HttpServletRequest second = mock(HttpServletRequest.class);
        when(second.getRemoteAddr()).thenReturn("203.0.113.7");
        when(second.getHeader("X-Forwarded-For")).thenReturn("2.2.2.2");

        assertEquals(
                filter.clientKey(first),
                filter.clientKey(second),
                "spoofing X-Forwarded-For must not change the rate-limit bucket for the same real peer"
        );
        assertEquals("203.0.113.7", filter.clientKey(first));
    }
}
