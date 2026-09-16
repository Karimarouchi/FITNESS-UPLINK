package com.fitnessuplink.auth;

import com.fitnessuplink.auth.mail.MailProperties;
import com.fitnessuplink.auth.mail.MailService;
import com.fitnessuplink.auth.token.TokenHasher;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailCodeServiceTest {

    @Mock
    private EmailCodeRepository emailCodeRepository;
    @Mock
    private MailService mailService;

    private TokenHasher tokenHasher;
    private EmailCodeService service;
    private User user;

    @BeforeEach
    void setUp() {
        tokenHasher = new TokenHasher();
        service = new EmailCodeService(
                emailCodeRepository,
                tokenHasher,
                mailService,
                new MailProperties("Fitness Uplink", "karimarouchi123@gmail.com", Duration.ofMinutes(10), Duration.ofSeconds(60), 5, "test-secret"),
                Runnable::run
        );
        user = User.builder()
                .id(UUID.randomUUID())
                .email("new@example.com")
                .passwordHash("hash")
                .firstName("Karim")
                .lastName("Arouchi")
                .displayName("Karim Arouchi")
                .enabled(true)
                .build();
    }

    @Test
    void issueAndSendPersistsHashedCode() {
        when(emailCodeRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc(user.getEmail(), EmailCodePurpose.VERIFY_EMAIL))
                .thenReturn(Optional.empty());
        when(emailCodeRepository.save(any(EmailCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.issueAndSend(user, EmailCodePurpose.VERIFY_EMAIL);

        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendCode(eq(user.getEmail()), eq(user.getFirstName()), eq(EmailCodePurpose.VERIFY_EMAIL), codeCaptor.capture());
        ArgumentCaptor<EmailCode> storedCaptor = ArgumentCaptor.forClass(EmailCode.class);
        verify(emailCodeRepository).save(storedCaptor.capture());
        assertEquals(6, codeCaptor.getValue().length());
        assertEquals(tokenHasher.sha256(codeCaptor.getValue()), storedCaptor.getValue().getCodeHash());
        assertNotNull(storedCaptor.getValue().getExpiresAt());
    }

    @Test
    void issueAndSendRespectsCooldown() {
        EmailCode last = EmailCode.builder()
                .id(UUID.randomUUID())
                .user(user)
                .email(user.getEmail())
                .purpose(EmailCodePurpose.VERIFY_EMAIL)
                .codeHash("x")
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(600))
                .build();
        when(emailCodeRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc(user.getEmail(), EmailCodePurpose.VERIFY_EMAIL))
                .thenReturn(Optional.of(last));

        ApiException ex = assertThrows(ApiException.class, () -> service.issueAndSend(user, EmailCodePurpose.VERIFY_EMAIL));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        verify(mailService, never()).sendCode(any(), any(), any(), any());
    }

    @Test
    void consumeAcceptsValidCode() {
        String code = "123456";
        EmailCode stored = EmailCode.builder()
                .id(UUID.randomUUID())
                .user(user)
                .email(user.getEmail())
                .purpose(EmailCodePurpose.VERIFY_EMAIL)
                .codeHash(tokenHasher.sha256(code))
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(600))
                .attempts(0)
                .build();
        when(emailCodeRepository.findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                user.getEmail(), EmailCodePurpose.VERIFY_EMAIL
        )).thenReturn(Optional.of(stored));
        when(emailCodeRepository.save(any(EmailCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.consume(user, EmailCodePurpose.VERIFY_EMAIL, code);

        assertNotNull(stored.getConsumedAt());
    }

    @Test
    void assertValidDoesNotConsume() {
        String code = "123456";
        EmailCode stored = EmailCode.builder()
                .id(UUID.randomUUID())
                .user(user)
                .email(user.getEmail())
                .purpose(EmailCodePurpose.RESET_PASSWORD)
                .codeHash(tokenHasher.sha256(code))
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(600))
                .attempts(0)
                .build();
        when(emailCodeRepository.findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                user.getEmail(), EmailCodePurpose.RESET_PASSWORD
        )).thenReturn(Optional.of(stored));

        service.assertValid(user, EmailCodePurpose.RESET_PASSWORD, code);

        org.junit.jupiter.api.Assertions.assertNull(stored.getConsumedAt());
        verify(emailCodeRepository, never()).save(any());
    }

    @Test
    void consumeRejectsWrongCode() {
        EmailCode stored = EmailCode.builder()
                .id(UUID.randomUUID())
                .user(user)
                .email(user.getEmail())
                .purpose(EmailCodePurpose.VERIFY_EMAIL)
                .codeHash(tokenHasher.sha256("123456"))
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(600))
                .attempts(0)
                .build();
        when(emailCodeRepository.findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                user.getEmail(), EmailCodePurpose.VERIFY_EMAIL
        )).thenReturn(Optional.of(stored));
        when(emailCodeRepository.save(any(EmailCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ApiException ex = assertThrows(
                ApiException.class,
                () -> service.consume(user, EmailCodePurpose.VERIFY_EMAIL, "000000")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals(1, stored.getAttempts());
    }
}
