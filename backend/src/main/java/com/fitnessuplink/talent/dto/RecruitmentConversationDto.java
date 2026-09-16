package com.fitnessuplink.talent.dto;

import com.fitnessuplink.talent.PipelineStatus;

import java.time.Instant;
import java.util.UUID;

public record RecruitmentConversationDto(
        UUID id,
        String peerName,
        String title,
        String lastBody,
        Instant lastAt,
        boolean lastMine,
        PipelineStatus status
) {
}
