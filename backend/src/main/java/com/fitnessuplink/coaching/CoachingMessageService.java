package com.fitnessuplink.coaching;

import com.fitnessuplink.coaching.dto.CoachingDtos.MessageDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.SendMessageRequest;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CoachingMessageService {

    private final CoachingBookingRepository bookingRepository;
    private final CoachingMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final UploadService uploadService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<MessageDto> thread(User viewer, UUID bookingId) {
        CoachingBooking booking = requireParty(viewer, bookingId);
        List<CoachingMessage> messages = messageRepository.findByBookingIdOrderByCreatedAtAsc(booking.getId());
        Map<UUID, User> senders = userRepository.findByIdIn(messages.stream().map(CoachingMessage::getSenderId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, u -> u));
        return messages.stream()
                .map(m -> new MessageDto(
                        m.getId(),
                        m.getSenderId(),
                        senders.containsKey(m.getSenderId()) ? senders.get(m.getSenderId()).getDisplayName() : "Utilisateur",
                        m.getBody(),
                        m.getUploadId(),
                        m.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public MessageDto send(User sender, UUID bookingId, SendMessageRequest request) {
        CoachingBooking booking = requireParty(sender, bookingId);
        String body = request.body() == null ? "" : request.body().trim();
        if (body.isBlank() && request.uploadId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_EMPTY");
        }
        CoachingMessage message = CoachingMessage.builder()
                .id(UUID.randomUUID())
                .bookingId(booking.getId())
                .senderId(sender.getId())
                .body(body.isBlank() ? null : body)
                .uploadId(request.uploadId())
                .createdAt(Instant.now())
                .build();
        messageRepository.save(message);
        UUID recipient = booking.getCoachId().equals(sender.getId()) ? booking.getClientId() : booking.getCoachId();
        notificationService.notify(recipient, NotifyCategory.MESSAGE,
                "Nouveau message", sender.getDisplayName() + " vous a envoyé un message.", "Voir", "/app/coaching/bookings");
        return new MessageDto(message.getId(), sender.getId(), sender.getDisplayName(), message.getBody(), message.getUploadId(), message.getCreatedAt());
    }

    @Transactional
    public UUID uploadAttachment(User sender, UUID bookingId, MultipartFile file) {
        requireParty(sender, bookingId);
        return uploadService.storeHireFile(sender.getId(), file).getId();
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload attachment(User viewer, UUID bookingId, UUID messageId) {
        CoachingBooking booking = requireParty(viewer, bookingId);
        CoachingMessage message = messageRepository.findByBookingIdOrderByCreatedAtAsc(booking.getId()).stream()
                .filter(m -> m.getId().equals(messageId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MESSAGE_NOT_FOUND"));
        if (message.getUploadId() == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "ATTACHMENT_NOT_FOUND");
        }
        return uploadService.loadAny(message.getUploadId());
    }

    private CoachingBooking requireParty(User viewer, UUID bookingId) {
        CoachingBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND"));
        if (!viewer.isSuperAdmin() && !booking.getCoachId().equals(viewer.getId()) && !booking.getClientId().equals(viewer.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        return booking;
    }
}
