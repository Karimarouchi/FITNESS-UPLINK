package com.fitnessuplink.auth;

import com.fitnessuplink.auth.config.SecurityProperties;
import com.fitnessuplink.auth.dto.AuthResponse;
import com.fitnessuplink.auth.dto.LoginRequest;
import com.fitnessuplink.auth.dto.SignupRequest;
import com.fitnessuplink.auth.jwt.JwtService;
import com.fitnessuplink.auth.token.RefreshToken;
import com.fitnessuplink.auth.token.RefreshTokenRepository;
import com.fitnessuplink.auth.token.TokenHasher;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Invalid email or password";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenHasher tokenHasher;
    private final UserService userService;
    private final SecurityProperties securityProperties;
    private String dummyHash;

    @PostConstruct
    void initTimingGuard() {
        this.dummyHash = passwordEncoder.encode("FitnessUplinkTimingGuard");
    }

    @Transactional
    public IssuedAuth signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (email.equals(normalizeEmail(securityProperties.superAdmin().email()))) {
            throw new ApiException(HttpStatus.CONFLICT, "Unable to create this account");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .enabled(true)
                .onboardingCompleted(false)
                .build();
        userRepository.save(user);
        return issueTokens(user, false);
    }

    @Transactional
    public IssuedAuth login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            passwordEncoder.matches(request.password(), dummyHash);
            throw new ApiException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is disabled");
        }
        Instant now = Instant.now();
        if (user.isLocked(now)) {
            throw new ApiException(HttpStatus.LOCKED, "Account temporarily locked. Try again later.");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            registerFailure(user, now);
            throw new ApiException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(now);
        userRepository.save(user);
        return issueTokens(user, request.rememberMe());
    }

    @Transactional
    public IssuedAuth refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Session expired");
        }
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHasher.sha256(rawRefreshToken))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired"));

        Instant now = Instant.now();
        if (stored.isRevoked() || stored.isExpired(now)) {
            if (stored.isRevoked()) {
                refreshTokenRepository.revokeAllActiveByUserId(stored.getUser().getId());
            }
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Session expired");
        }

        stored.setRevoked(true);
        User user = stored.getUser();
        if (!user.isEnabled() || user.isLocked(now)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Session expired");
        }

        IssuedAuth issued = issueTokens(user, isRememberMe(stored));
        stored.setReplacedBy(issued.refreshTokenId());
        refreshTokenRepository.save(stored);
        return issued;
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(tokenHasher.sha256(rawRefreshToken))
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }

    private IssuedAuth issueTokens(User user, boolean rememberMe) {
        Duration refreshTtl = rememberMe
                ? securityProperties.refreshToken().rememberMeTtl()
                : securityProperties.refreshToken().ttl();
        String rawRefresh = tokenHasher.newRawToken();
        RefreshToken refreshToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(user)
                .tokenHash(tokenHasher.sha256(rawRefresh))
                .expiresAt(Instant.now().plus(refreshTtl))
                .revoked(false)
                .createdAt(Instant.now())
                .build();
        refreshTokenRepository.save(refreshToken);

        AuthResponse response = new AuthResponse(
                jwtService.createAccessToken(user),
                "Bearer",
                jwtService.accessTokenTtlSeconds(),
                userService.toResponse(user)
        );
        return new IssuedAuth(response, rawRefresh, refreshTtl, refreshToken.getId());
    }

    private void registerFailure(User user, Instant now) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= securityProperties.lockout().maxAttempts()) {
            user.setLockedUntil(now.plus(securityProperties.lockout().duration()));
            user.setFailedLoginAttempts(0);
        }
        userRepository.save(user);
    }

    private boolean isRememberMe(RefreshToken token) {
        Duration lifetime = Duration.between(token.getCreatedAt(), token.getExpiresAt());
        return lifetime.compareTo(securityProperties.refreshToken().ttl()) > 0;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public record IssuedAuth(
            AuthResponse response,
            String rawRefreshToken,
            Duration refreshTtl,
            UUID refreshTokenId
    ) {
    }
}
