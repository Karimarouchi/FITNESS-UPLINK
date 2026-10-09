package com.fitnessuplink.auth;

import com.fitnessuplink.audit.AuditLogService;
import com.fitnessuplink.auth.config.SecurityProperties;
import com.fitnessuplink.auth.dto.ForgotPasswordRequest;
import com.fitnessuplink.auth.dto.ResetPasswordRequest;
import com.fitnessuplink.auth.dto.SignupCodeRequests.VerifySignupRequest;
import com.fitnessuplink.auth.dto.SignupRequest;
import com.fitnessuplink.auth.jwt.JwtService;
import com.fitnessuplink.auth.mail.MailProperties;
import com.fitnessuplink.auth.recaptcha.RecaptchaService;
import com.fitnessuplink.auth.token.RefreshTokenRepository;
import com.fitnessuplink.auth.token.TokenHasher;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceEmailActionsTest {

    @Mock private UserRepository userRepository;
    @Mock private PendingSignupRepository pendingSignupRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private UserService userService;
    @Mock private EmailCodeService emailCodeService;
    @Mock private RecaptchaService recaptchaService;
    @Mock private com.fitnessuplink.auth.mail.MailService mailService;
    @Mock private AuditLogService auditLogService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        SecurityProperties securityProperties = new SecurityProperties(
                new SecurityProperties.Jwt("secret-secret-secret-secret-secret-secret-secret-secret-secret-secret", Duration.ofMinutes(15)),
                new SecurityProperties.RefreshToken("refresh_token", "/api/v1/auth", Duration.ofHours(12), Duration.ofDays(30)),
                new SecurityProperties.Cookie(false),
                new SecurityProperties.Lockout(5, Duration.ofMinutes(15)),
                new SecurityProperties.SuperAdmin("admin@example.com", "Admin@123456", "Admin", "Antigone")
        );
        authService = new AuthService(
                userRepository,
                pendingSignupRepository,
                new MailProperties("Fitness Uplink", "noreply@example.com", Duration.ofMinutes(10), Duration.ofSeconds(60), 5, ""),
                refreshTokenRepository,
                passwordEncoder,
                jwtService,
                new TokenHasher(),
                userService,
                securityProperties,
                emailCodeService,
                recaptchaService,
                mailService,
                auditLogService
        );
        authService.initTimingGuard();
    }

    @Test
    void forgotPasswordDoesNotRevealMissingAccount() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());
        authService.forgotPassword(new ForgotPasswordRequest("missing@example.com"));
        verify(emailCodeService, never()).issueAndSend(any(), any());
    }

    @Test
    void resetPasswordUpdatesHashAndRevokesSessions() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .passwordHash("old")
                .firstName("Jane")
                .lastName("Doe")
                .displayName("Jane Doe")
                .enabled(true)
                .build();
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("Newpass1!")).thenReturn("new-hash");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.resetPassword(new ResetPasswordRequest("user@example.com", "123456", "Newpass1!", "Newpass1!"));

        verify(emailCodeService).consume(user, EmailCodePurpose.RESET_PASSWORD, "123456");
        assertEquals("new-hash", user.getPasswordHash());
        verify(refreshTokenRepository).revokeAllActiveByUserId(user.getId());
    }

    @Test
    void resetPasswordRejectsUnknownEmail() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());
        ApiException ex = assertThrows(
                ApiException.class,
                () -> authService.resetPassword(new ResetPasswordRequest("nobody@example.com", "123456", "Newpass1!", "Newpass1!"))
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(emailCodeService, never()).consume(any(), any(), any());
    }

    @Test
    void verifyEmailMarksUserVerified() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .displayName("Jane Doe")
                .enabled(true)
                .emailVerified(false)
                .build();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.verifyEmail(user.getId(), "654321");

        verify(emailCodeService).consume(eq(user), eq(EmailCodePurpose.VERIFY_EMAIL), eq("654321"));
        verify(mailService).enqueueWelcome(user);
        org.junit.jupiter.api.Assertions.assertTrue(user.isEmailVerified());
    }

    @Test
    void changeUnverifiedEmailUpdatesAddressAndSendsCode() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("wrong@example.com")
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .displayName("Jane Doe")
                .enabled(true)
                .emailVerified(false)
                .build();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByEmail("fixed@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.changeUnverifiedEmail(user.getId(), new com.fitnessuplink.auth.dto.ChangeEmailRequest("fixed@example.com"));

        assertEquals("fixed@example.com", user.getEmail());
        verify(emailCodeService).issueAndSend(user, EmailCodePurpose.VERIFY_EMAIL);
    }

    @Test
    void signupNeverCreatesAccountAndFailsWhenCodeCannotBeSent() {
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(pendingSignupRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Newpass1!")).thenReturn("hash");
        doThrow(new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SMTP n'est pas configuré."))
                .when(mailService).sendCode(eq("new@example.com"), eq("Jane"), eq(EmailCodePurpose.VERIFY_EMAIL), any());

        ApiException ex = assertThrows(ApiException.class, () -> authService.signup(signupRequest()));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void signupKeepsPendingRecordOnlyAndSendsCode() {
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(pendingSignupRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Newpass1!")).thenReturn("hash");

        var response = authService.signup(signupRequest());

        assertEquals("new@example.com", response.email());
        verify(pendingSignupRepository).save(any(PendingSignup.class));
        verify(mailService).sendCode(eq("new@example.com"), eq("Jane"), eq(EmailCodePurpose.VERIFY_EMAIL), any());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void verifySignupRejectsWrongCodeWithoutCreatingAccount() {
        PendingSignup pending = pendingWithCode("123456");
        when(pendingSignupRepository.findByEmail("new@example.com")).thenReturn(Optional.of(pending));

        ApiException ex = assertThrows(
                ApiException.class,
                () -> authService.verifySignup(new VerifySignupRequest("new@example.com", "000000"))
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals(1, pending.getAttempts());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void verifySignupCreatesVerifiedAccountWithCorrectCode() {
        PendingSignup pending = pendingWithCode("123456");
        when(pendingSignupRepository.findByEmail("new@example.com")).thenReturn(Optional.of(pending));
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.verifySignup(new VerifySignupRequest("new@example.com", "123456"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertTrue(saved.getValue().isEmailVerified());
        assertEquals("hash", saved.getValue().getPasswordHash());
        verify(pendingSignupRepository).delete(pending);
        verify(mailService).enqueueWelcome(saved.getValue());
    }

    private SignupRequest signupRequest() {
        return new SignupRequest("Jane", "Doe", "new@example.com", "Newpass1!", "Newpass1!", true, null);
    }

    private PendingSignup pendingWithCode(String code) {
        Instant now = Instant.now();
        return PendingSignup.builder()
                .id(UUID.randomUUID())
                .email("new@example.com")
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .codeHash(new TokenHasher().sha256(code))
                .codeExpiresAt(now.plus(Duration.ofMinutes(10)))
                .attempts(0)
                .lastSentAt(now)
                .expiresAt(now.plus(Duration.ofHours(24)))
                .createdAt(now)
                .build();
    }
}
