package com.fitnessuplink.auth;

import com.fitnessuplink.auth.mail.MailProperties;
import com.fitnessuplink.auth.mail.MailService;
import com.fitnessuplink.auth.token.TokenHasher;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
public class EmailCodeService {

    static final String INVALID_CODE = "Code invalide ou expiré";

    private final EmailCodeRepository emailCodeRepository;
    private final TokenHasher tokenHasher;
    private final MailService mailService;
    private final MailProperties mailProperties;
    private final TaskExecutor mailExecutor;

    public EmailCodeService(
            EmailCodeRepository emailCodeRepository,
            TokenHasher tokenHasher,
            MailService mailService,
            MailProperties mailProperties,
            @Qualifier("mailExecutor") TaskExecutor mailExecutor
    ) {
        this.emailCodeRepository = emailCodeRepository;
        this.tokenHasher = tokenHasher;
        this.mailService = mailService;
        this.mailProperties = mailProperties;
        this.mailExecutor = mailExecutor;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void issueAndSend(User user, EmailCodePurpose purpose) {
        Instant now = Instant.now();
        emailCodeRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc(user.getEmail(), purpose)
                .ifPresent(last -> {
                    Instant retryAt = last.getCreatedAt().plus(mailProperties.resendCooldown());
                    if (now.isBefore(retryAt)) {
                        throw new ApiException(
                                HttpStatus.TOO_MANY_REQUESTS,
                                "Un code a déjà été envoyé. Réessayez dans une minute."
                        );
                    }
                });

        String code = tokenHasher.newNumericCode(6);
        EmailCode stored = EmailCode.builder()
                .id(UUID.randomUUID())
                .user(user)
                .email(user.getEmail())
                .purpose(purpose)
                .codeHash(tokenHasher.sha256(code))
                .expiresAt(now.plus(mailProperties.codeTtl()))
                .attempts(0)
                .createdAt(now)
                .build();
        emailCodeRepository.save(stored);
        enqueueMail(user, purpose, code);
    }

    /** How many codes of this kind were issued to the account since the given instant. */
    @Transactional(readOnly = true)
    public long issuedSince(User user, EmailCodePurpose purpose, Instant since) {
        return emailCodeRepository.countByEmailAndPurposeAndCreatedAtAfter(user.getEmail(), purpose, since);
    }

    /** Makes the newest unused code unusable (e.g. after too many wrong guesses). */
    @Transactional(noRollbackFor = ApiException.class)
    public void invalidateOpen(User user, EmailCodePurpose purpose) {
        emailCodeRepository
                .findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(user.getEmail(), purpose)
                .ifPresent(code -> {
                    code.setConsumedAt(Instant.now());
                    emailCodeRepository.save(code);
                });
    }

    private void enqueueMail(User user, EmailCodePurpose purpose, String code) {
        String email = user.getEmail();
        String firstName = user.getFirstName();
        Runnable send = () -> {
            try {
                mailService.sendCode(email, firstName, purpose, code);
            } catch (Exception ex) {
                log.warn("event=mail_code_skipped purpose={}", purpose);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    mailExecutor.execute(send);
                }
            });
            return;
        }
        send.run();
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void assertValid(User user, EmailCodePurpose purpose, String rawCode) {
        match(user, purpose, rawCode, false);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void consume(User user, EmailCodePurpose purpose, String rawCode) {
        match(user, purpose, rawCode, true);
    }

    private void match(User user, EmailCodePurpose purpose, String rawCode, boolean consume) {
        String normalized = rawCode == null ? "" : rawCode.trim();
        EmailCode stored = emailCodeRepository
                .findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(user.getEmail(), purpose)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, INVALID_CODE));

        Instant now = Instant.now();
        if (stored.getConsumedAt() != null
                || now.isAfter(stored.getExpiresAt())
                || stored.getAttempts() >= mailProperties.maxAttempts()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, INVALID_CODE);
        }
        if (!stored.getUser().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, INVALID_CODE);
        }
        if (!tokenHasher.sha256(normalized).equals(stored.getCodeHash())) {
            stored.setAttempts(stored.getAttempts() + 1);
            emailCodeRepository.save(stored);
            throw new ApiException(HttpStatus.BAD_REQUEST, INVALID_CODE);
        }
        if (consume) {
            stored.setConsumedAt(now);
            emailCodeRepository.save(stored);
        }
    }
}
