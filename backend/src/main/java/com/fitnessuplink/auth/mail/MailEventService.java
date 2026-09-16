package com.fitnessuplink.auth.mail;

import com.fitnessuplink.auth.mail.dto.MailEventDto;
import com.fitnessuplink.auth.mail.dto.MailEventPageDto;
import com.fitnessuplink.auth.token.TokenHasher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailEventService {

    private final MailEventRepository mailEventRepository;
    private final TokenHasher tokenHasher;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            MailPurpose purpose,
            MailEventStatus status,
            String recipient,
            String errorCode,
            String errorMessage,
            int durationMs
    ) {
        String masked = MailAddressMasker.mask(recipient);
        MailEvent event = MailEvent.builder()
                .id(UUID.randomUUID())
                .createdAt(Instant.now())
                .purpose(purpose)
                .status(status)
                .recipientHash(tokenHasher.sha256(recipient == null ? "" : recipient.trim().toLowerCase()))
                .recipientMasked(masked)
                .errorCode(status == MailEventStatus.FAILED ? errorCode : null)
                .errorMessage(status == MailEventStatus.FAILED ? MailAddressMasker.sanitizeError(errorMessage) : null)
                .durationMs(durationMs)
                .build();
        mailEventRepository.save(event);
        if (status == MailEventStatus.FAILED) {
            log.warn(
                    "event=mail_send_failed purpose={} recipient={} error_code={} duration_ms={}",
                    purpose,
                    masked,
                    errorCode,
                    durationMs
            );
        } else {
            log.info("event=mail_send_ok purpose={} recipient={} duration_ms={}", purpose, masked, durationMs);
        }
    }

    @Transactional(readOnly = true)
    public MailEventPageDto list(MailEventStatus status, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        PageRequest request = PageRequest.of(safePage, safeSize);
        Page<MailEvent> result = status == null
                ? mailEventRepository.findAllByOrderByCreatedAtDesc(request)
                : mailEventRepository.findByStatusOrderByCreatedAtDesc(status, request);
        return new MailEventPageDto(
                result.getContent().stream().map(this::toDto).toList(),
                result.getTotalElements(),
                result.getNumber(),
                result.getSize()
        );
    }

    private MailEventDto toDto(MailEvent event) {
        return new MailEventDto(
                event.getId(),
                event.getCreatedAt(),
                event.getPurpose(),
                event.getStatus(),
                event.getRecipientMasked(),
                event.getErrorCode(),
                event.getErrorMessage(),
                event.getDurationMs()
        );
    }
}
