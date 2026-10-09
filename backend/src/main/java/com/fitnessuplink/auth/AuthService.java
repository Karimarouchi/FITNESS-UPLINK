package com.fitnessuplink.auth;

import com.fitnessuplink.auth.config.SecurityProperties;
import com.fitnessuplink.auth.dto.AuthResponse;
import com.fitnessuplink.auth.dto.ForgotPasswordRequest;
import com.fitnessuplink.auth.dto.LoginRequest;
import com.fitnessuplink.auth.dto.ResetPasswordRequest;
import com.fitnessuplink.auth.dto.SignupRequest;
import com.fitnessuplink.auth.dto.ChangeEmailRequest;
import com.fitnessuplink.auth.dto.SignupCodeRequests.PendingSignupResponse;
import com.fitnessuplink.auth.dto.SignupCodeRequests.ResendSignupRequest;
import com.fitnessuplink.auth.dto.SignupCodeRequests.VerifySignupRequest;
import com.fitnessuplink.auth.dto.VerifyResetCodeRequest;
import com.fitnessuplink.auth.jwt.JwtService;
import com.fitnessuplink.auth.mail.MailAddressMasker;
import com.fitnessuplink.auth.mail.MailProperties;
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
import org.springframework.scheduling.annotation.Scheduled;
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
    private static final String SIGNUP_EXPIRED = "Cette inscription a expiré. Recommencez la création de votre compte.";
    private static final String SIGNUP_CODE_EXPIRED = "Ce code a expiré. Demandez un nouveau code.";
    private static final String SIGNUP_MAIL_FAILED =
            "Impossible d'envoyer le code de vérification pour le moment. Aucun compte n'a été créé, réessayez plus tard.";
    private static final Duration PENDING_SIGNUP_TTL = Duration.ofHours(24);

    private final UserRepository userRepository;
    private final PendingSignupRepository pendingSignupRepository;
    private final MailProperties mailProperties;
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
    public PendingSignupResponse signup(SignupRequest request) {
        recaptchaService.verify(request.recaptchaToken(), "signup");
        String email = normalizeEmail(request.email());
        if (email.equals(normalizeEmail(securityProperties.superAdmin().email()))) {
            throw new ApiException(HttpStatus.CONFLICT, "Unable to create this account");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        Instant now = Instant.now();
        PendingSignup pending = pendingSignupRepository.findByEmail(email).orElse(null);
        boolean codeStillFresh = pending != null
                && now.isBefore(pending.getLastSentAt().plus(mailProperties.resendCooldown()))
                && now.isBefore(pending.getCodeExpiresAt());
        if (pending == null) {
            pending = PendingSignup.builder()
                    .id(UUID.randomUUID())
                    .email(email)
                    .createdAt(now)
                    .build();
        }
        pending.setPasswordHash(passwordEncoder.encode(request.password()));
        pending.setFirstName(request.firstName().trim());
        pending.setLastName(request.lastName().trim());
        pending.setExpiresAt(now.plus(PENDING_SIGNUP_TTL));
        if (codeStillFresh) {
            pendingSignupRepository.save(pending);
        } else {
            sendSignupCode(pending, now);
        }
        return pendingResponse(pending, now);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public IssuedAuth verifySignup(VerifySignupRequest request) {
        String email = normalizeEmail(request.email());
        PendingSignup pending = pendingSignupRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, SIGNUP_EXPIRED));
        Instant now = Instant.now();
        if (now.isAfter(pending.getExpiresAt())) {
            pendingSignupRepository.delete(pending);
            throw new ApiException(HttpStatus.BAD_REQUEST, SIGNUP_EXPIRED);
        }
        if (pending.getAttempts() >= mailProperties.maxAttempts() || now.isAfter(pending.getCodeExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, SIGNUP_CODE_EXPIRED);
        }
        if (!tokenHasher.sha256(request.code().trim()).equals(pending.getCodeHash())) {
            pending.setAttempts(pending.getAttempts() + 1);
            pendingSignupRepository.save(pending);
            throw new ApiException(HttpStatus.BAD_REQUEST, EmailCodeService.INVALID_CODE);
        }
        if (userRepository.existsByEmail(email)) {
            pendingSignupRepository.delete(pending);
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        User user = User.builder()
                .email(email)
                .passwordHash(pending.getPasswordHash())
                .firstName(pending.getFirstName())
                .lastName(pending.getLastName())
                .enabled(true)
                .onboardingCompleted(false)
                .emailVerified(true)
                .build();
        userRepository.save(user);
        pendingSignupRepository.delete(pending);
        mailService.enqueueWelcome(user);
        return issueTokens(user, false);
    }

    @Transactional
    public PendingSignupResponse resendSignupCode(ResendSignupRequest request) {
        String email = normalizeEmail(request.email());
        PendingSignup pending = pendingSignupRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, SIGNUP_EXPIRED));
        Instant now = Instant.now();
        if (now.isAfter(pending.getExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, SIGNUP_EXPIRED);
        }
        if (now.isBefore(pending.getLastSentAt().plus(mailProperties.resendCooldown()))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Un code a déjà été envoyé. Réessayez dans une minute.");
        }
        pending.setExpiresAt(now.plus(PENDING_SIGNUP_TTL));
        sendSignupCode(pending, now);
        return pendingResponse(pending, now);
    }

    @Scheduled(cron = "0 15 * * * *")
    @Transactional
    public void purgeExpiredSignups() {
        int removed = pendingSignupRepository.deleteExpired(Instant.now());
        if (removed > 0) {
            log.info("event=pending_signups_purged count={}", removed);
        }
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

    /**
     * Sends synchronously so a delivery failure aborts the surrounding transaction:
     * no pending signup is kept for a code the user never received.
     */
    private void sendSignupCode(PendingSignup pending, Instant now) {
        String code = tokenHasher.newNumericCode(6);
        pending.setCodeHash(tokenHasher.sha256(code));
        pending.setCodeExpiresAt(now.plus(mailProperties.codeTtl()));
        pending.setAttempts(0);
        pending.setLastSentAt(now);
        pendingSignupRepository.save(pending);
        try {
            mailService.sendCode(pending.getEmail(), pending.getFirstName(), EmailCodePurpose.VERIFY_EMAIL, code);
        } catch (ApiException ex) {
            log.warn("event=signup_code_failed recipient={}", MailAddressMasker.mask(pending.getEmail()));
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, SIGNUP_MAIL_FAILED);
        }
    }

    private PendingSignupResponse pendingResponse(PendingSignup pending, Instant now) {
        long expiresIn = Math.max(0, Duration.between(now, pending.getCodeExpiresAt()).toSeconds());
        long resendIn = Math.max(0, Duration.between(now, pending.getLastSentAt().plus(mailProperties.resendCooldown())).toSeconds());
        return new PendingSignupResponse(pending.getEmail(), expiresIn, resendIn);
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
