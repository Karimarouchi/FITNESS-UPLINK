package com.fitnessuplink.auth;

import com.fitnessuplink.auth.config.SecurityProperties;
import com.fitnessuplink.auth.dto.AuthResponse;
import com.fitnessuplink.auth.dto.ForgotPasswordRequest;
import com.fitnessuplink.auth.dto.LoginRequest;
import com.fitnessuplink.auth.dto.ResetPasswordRequest;
import com.fitnessuplink.auth.dto.SignupRequest;
import com.fitnessuplink.auth.dto.ChangeEmailRequest;
import com.fitnessuplink.auth.dto.VerifyResetCodeRequest;
import com.fitnessuplink.auth.jwt.JwtService;
import com.fitnessuplink.auth.mail.MailAddressMasker;
import com.fitnessuplink.auth.mail.MailService;
import com.fitnessuplink.auth.recaptcha.RecaptchaService;
import com.fitnessuplink.auth.token.RefreshToken;
import com.fitnessuplink.auth.token.RefreshTokenRepository;
import com.fitnessuplink.auth.token.TokenHasher;
import com.fitnessuplink.audit.AuditAction;
import com.fitnessuplink.audit.AuditLogService;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.UserService;
import com.fitnessuplink.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Slf4j
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
    private final EmailCodeService emailCodeService;
    private final RecaptchaService recaptchaService;
    private final MailService mailService;
    private final AuditLogService auditLogService;
    private String dummyHash;

    @PostConstruct
    void initTimingGuard() {
        this.dummyHash = passwordEncoder.encode("FitnessUplinkTimingGuard");
    }

    @Transactional
    public IssuedAuth signup(SignupRequest request) {
        recaptchaService.verify(request.recaptchaToken(), "signup");
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
                .emailVerified(false)
                .build();
        userRepository.save(user);
        sendCodeQuietly(user, EmailCodePurpose.VERIFY_EMAIL);
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
        auditLogService.recordForUser(user.getId(), user.getId(), AuditAction.LOGIN_SUCCESS);
        return issueTokens(user, request.rememberMe());
    }

    @Transactional
    public UserResponse verifyEmail(UUID userId, String code) {
        User user = requireUser(userId);
        if (user.isEmailVerified()) {
            return userService.toResponse(user);
        }
        emailCodeService.consume(user, EmailCodePurpose.VERIFY_EMAIL, code);
        user.setEmailVerified(true);
        User saved = userRepository.save(user);
        mailService.enqueueWelcome(saved);
        return userService.toResponse(saved);
    }

    @Transactional
    public void resendVerification(UUID userId) {
        User user = requireUser(userId);
        if (user.isEmailVerified()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email déjà vérifié");
        }
        emailCodeService.issueAndSend(user, EmailCodePurpose.VERIFY_EMAIL);
    }

    @Transactional
    public UserResponse changeUnverifiedEmail(UUID userId, ChangeEmailRequest request) {
        User user = requireUser(userId);
        if (user.isEmailVerified()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email déjà vérifié");
        }
        String email = normalizeEmail(request.email());
        if (email.equals(normalizeEmail(securityProperties.superAdmin().email()))) {
            throw new ApiException(HttpStatus.CONFLICT, "Unable to use this email");
        }
        if (email.equals(user.getEmail())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "C'est déjà votre email actuel.");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        user.setEmail(email);
        userRepository.save(user);
        emailCodeService.issueAndSend(user, EmailCodePurpose.VERIFY_EMAIL);
        return userService.toResponse(user);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !user.isEnabled()) {
            return;
        }
        try {
            emailCodeService.issueAndSend(user, EmailCodePurpose.RESET_PASSWORD);
        } catch (ApiException ex) {
            if (ex.getStatus() != HttpStatus.TOO_MANY_REQUESTS && ex.getStatus() != HttpStatus.SERVICE_UNAVAILABLE) {
                throw ex;
            }
            log.warn(
                    "event=mail_code_skipped purpose={} recipient={}",
                    EmailCodePurpose.RESET_PASSWORD,
                    MailAddressMasker.mask(email)
            );
        }
    }

    @Transactional
    public void verifyResetCode(VerifyResetCodeRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, EmailCodeService.INVALID_CODE));
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, EmailCodeService.INVALID_CODE);
        }
        emailCodeService.assertValid(user, EmailCodePurpose.RESET_PASSWORD, request.code());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, EmailCodeService.INVALID_CODE));
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, EmailCodeService.INVALID_CODE);
        }
        emailCodeService.consume(user, EmailCodePurpose.RESET_PASSWORD, request.code());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        refreshTokenRepository.revokeAllActiveByUserId(user.getId());
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

    private void sendCodeQuietly(User user, EmailCodePurpose purpose) {
        try {
            emailCodeService.issueAndSend(user, purpose);
        } catch (Exception ex) {
            log.warn("event=mail_code_skipped purpose={} recipient={}", purpose, MailAddressMasker.mask(user.getEmail()));
        }
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired"));
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
        auditLogService.recordForUser(user.getId(), user.getId(), AuditAction.LOGIN_FAILED);
        if (attempts >= securityProperties.lockout().maxAttempts()) {
            user.setLockedUntil(now.plus(securityProperties.lockout().duration()));
            user.setFailedLoginAttempts(0);
            auditLogService.recordForUser(user.getId(), user.getId(), AuditAction.ACCOUNT_LOCKED);
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
