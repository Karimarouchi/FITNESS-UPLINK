package com.fitnessuplink.talent.dto;

import java.time.Instant;
import java.util.UUID;


public record RecruitmentMessageDto(
        UUID id,
        UUID senderId,
        String senderName,
        boolean mine,
        String body,
        Instant createdAt,
        FileRef file
) {
}
