package com.fitnessuplink.notifications;

import com.fitnessuplink.notifications.dto.NotificationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserNotifyPrefsService userNotifyPrefsService;

    @Transactional
    public void notify(
            UUID userId,
            NotifyCategory category,
            String title,
            String message,
            String actionLabel,
            String actionPath
    ) {
        if (!userNotifyPrefsService.allowsInApp(userId, category)) {
            return;
        }
        notify(userId, title, message, actionLabel, actionPath);
    }

    @Transactional
    public void notify(UUID userId, String title, String message, String actionLabel, String actionPath) {
        notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .title(title)
                .message(message)
                .actionLabel(actionLabel)
                .actionPath(actionPath)
                .createdAt(Instant.now())
                .build());
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> list(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public List<NotificationDto> markRead(UUID userId, UUID id) {
        notificationRepository.findById(id)
                .filter(item -> item.getUserId().equals(userId))
                .ifPresent(item -> item.setReadAt(Instant.now()));
        return list(userId);
    }

    @Transactional
    public List<NotificationDto> markAllRead(UUID userId) {
        notificationRepository.markAllRead(userId, Instant.now());
        return list(userId);
    }

    private NotificationDto toDto(Notification notification) {
        return new NotificationDto(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getActionLabel(),
                notification.getActionPath(),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
}
