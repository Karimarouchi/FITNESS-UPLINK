package com.fitnessuplink.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final int LIMIT = 30;
    private static final long WINDOW_SECONDS = 15 * 60;
    private final Map<String, Window> attempts = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !(
                "/v1/auth/login".equals(path)
                        || "/v1/auth/signup".equals(path)
                        || "/v1/auth/signup/verify".equals(path)
                        || "/v1/auth/signup/resend".equals(path)
                        || "/v1/auth/forgot-password".equals(path)
                        || "/v1/auth/reset-password".equals(path)
                        || "/v1/auth/verify-reset-code".equals(path)
                        || "/v1/auth/verify-email".equals(path)
                        || "/v1/auth/resend-verification".equals(path)
                        || "/v1/auth/change-email".equals(path)
                        || isGuestMarketplacePath(path)
        );
    }

    private boolean isGuestMarketplacePath(String path) {
        if (!path.startsWith("/v1/marketplace/")) {
            return false;
        }
        return path.endsWith("/quote-requests") || path.endsWith("/confirm") || path.endsWith("/resend");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String key = clientKey(request);
        Window window = attempts.compute(key, (ignored, current) -> {
            long now = Instant.now().getEpochSecond();
            if (current == null || now - current.startEpoch >= WINDOW_SECONDS) {
                return new Window(now, 1);
            }
            return new Window(current.startEpoch, current.count + 1);
        });
        if (window.count > LIMIT) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("""
                    {"status":429,"error":"Too Many Requests","message":"Too many attempts. Try again later."}
                    """);
            return;
        }
        filterChain.doFilter(request, response);
    }

    String clientKey(HttpServletRequest request) {
        // Deliberately ignores X-Forwarded-For: this app has no trusted reverse proxy in front of it,
        // so that header is fully attacker-controlled and would let anyone bypass the limiter by
        // sending a fresh value on every request. getRemoteAddr() is the real socket peer.
        return request.getRemoteAddr();
    }

    private record Window(long startEpoch, int count) {
    }
}
