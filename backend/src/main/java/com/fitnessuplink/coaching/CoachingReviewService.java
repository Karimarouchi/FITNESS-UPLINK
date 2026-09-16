package com.fitnessuplink.coaching;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.coaching.dto.CoachingDtos.SubmitReviewRequest;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoachingReviewService {

    private final CoachingBookingRepository bookingRepository;
    private final CoachingReviewRepository reviewRepository;
    private final NotificationService notificationService;
    private final PermissionService permissionService;

    @Transactional
    public void submit(User client, UUID bookingId, SubmitReviewRequest request) {
        CoachingBooking booking = bookingRepository.findByIdAndClientId(bookingId, client.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND"));
        saveReview(client, booking, request);
    }

    @Transactional
    public void submitForCoach(User client, UUID coachId, SubmitReviewRequest request) {
        if (client.getId().equals(coachId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_REVIEW_SELF");
        }
        CoachingBooking booking = bookingRepository
                .findByCoachIdAndClientIdAndStatusOrderByScheduledAtDesc(coachId, client.getId(), CoachingBookingStatus.COMPLETED)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "BOOKING_NOT_COMPLETED"));
        saveReview(client, booking, request);
    }

    private void saveReview(User client, CoachingBooking booking, SubmitReviewRequest request) {
        permissionService.require(client, Permissions.COACHING_DISCOVER);
        if (booking.getStatus() != CoachingBookingStatus.COMPLETED) {
            throw new ApiException(HttpStatus.CONFLICT, "BOOKING_NOT_COMPLETED");
        }
        if (reviewRepository.existsByCoachIdAndClientId(booking.getCoachId(), client.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "REVIEW_ALREADY_SUBMITTED");
        }
        if (request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "RATING_INVALID");
        }
        reviewRepository.save(CoachingReview.builder()
                .id(UUID.randomUUID())
                .bookingId(booking.getId())
                .coachId(booking.getCoachId())
                .clientId(client.getId())
                .rating(request.rating().shortValue())
                .comment(request.comment() == null || request.comment().isBlank() ? null : request.comment().trim())
                .createdAt(Instant.now())
                .build());
        notificationService.notify(booking.getCoachId(), NotifyCategory.CONTACT,
                "Nouvel avis", client.getDisplayName() + " vous a laissé un avis.", "Voir", "/app/coaching/agenda");
    }
}
