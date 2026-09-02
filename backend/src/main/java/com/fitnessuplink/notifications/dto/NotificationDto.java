package com.fitnessuplink.notifications.dto;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
        UUID id,
        String title,
        String message,
        String actionLabel,
        String actionPath,
        Instant readAt,
        Instant createdAt
) {
}
