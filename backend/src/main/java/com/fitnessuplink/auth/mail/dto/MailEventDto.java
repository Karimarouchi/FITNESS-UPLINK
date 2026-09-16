package com.fitnessuplink.auth.mail.dto;

import com.fitnessuplink.auth.mail.MailEventStatus;
import com.fitnessuplink.auth.mail.MailPurpose;

import java.time.Instant;
import java.util.UUID;

public record MailEventDto(
        UUID id,
        Instant createdAt,
        MailPurpose purpose,
        MailEventStatus status,
        String recipientMasked,
        String errorCode,
        String errorMessage,
        Integer durationMs
) {
}
