package com.fitnessuplink.coaching;

import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class CoachingJobs {

    private final CoachingBookingRepository bookingRepository;
    private final CoachingPackRepository packRepository;
    private final CoachServiceRepository coachServiceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CoachingMailService coachingMailService;

    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void sendReminders() {
        Instant now = Instant.now();
        Instant soon = now.plusSeconds(3600);
        bookingRepository.findByStatusAndReminderSentAtIsNullAndScheduledAtBetween(
                CoachingBookingStatus.CONFIRMED, now, soon
        ).forEach(booking -> {
            notificationService.notify(booking.getClientId(), NotifyCategory.CONTACT,
                    "Séance bientôt", "Votre séance de coaching commence dans moins d'une heure.",
                    "Voir", "/app/coaching/bookings");
            notificationService.notify(booking.getCoachId(), NotifyCategory.CONTACT,
                    "Séance bientôt", "Une séance de coaching commence dans moins d'une heure.",
                    "Voir", "/app/coaching/agenda");

            User client = userRepository.findById(booking.getClientId()).orElse(null);
            User coach = userRepository.findById(booking.getCoachId()).orElse(null);
            String serviceName = coachServiceRepository.findById(booking.getCoachServiceId())
                    .map(CoachService::getName)
                    .orElse("Séance de coaching");
            if (client != null && coach != null) {
                coachingMailService.enqueueSessionReminder(client, coach.getDisplayName(), serviceName, booking.getScheduledAt());
                coachingMailService.enqueueSessionReminder(coach, client.getDisplayName(), serviceName, booking.getScheduledAt());
            }

            booking.setReminderSentAt(now);
            bookingRepository.save(booking);
        });
    }

    @Scheduled(cron = "0 */10 * * * *")
    @Transactional
    public void completePastBookings() {
        Instant now = Instant.now();
        bookingRepository.findByStatusAndScheduledAtBefore(CoachingBookingStatus.CONFIRMED, now).stream()
                .filter(booking -> booking.endsAt().isBefore(now))
                .forEach(booking -> {
                    booking.setStatus(CoachingBookingStatus.COMPLETED);
                    booking.setUpdatedAt(now);
                    bookingRepository.save(booking);
                });
    }

    @Scheduled(cron = "0 */10 * * * *")
    @Transactional
    public void expireUnresolvedRequests() {
        Instant now = Instant.now();
        bookingRepository.findByStatusInAndScheduledAtBefore(
                List.of(CoachingBookingStatus.PENDING, CoachingBookingStatus.AWAITING_PAYMENT), now
        ).forEach(booking -> {
            booking.setStatus(CoachingBookingStatus.CANCELLED);
            booking.setCancelledReason("Créneau expiré sans réponse");
            booking.setUpdatedAt(now);
            bookingRepository.save(booking);
            notificationService.notify(booking.getClientId(), NotifyCategory.CONTACT,
                    "Demande expirée", "Votre demande de séance n'a pas été traitée à temps et a été annulée.",
                    "Voir", "/app/coaching/bookings");
        });
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void expirePacks() {
        Instant now = Instant.now();
        packRepository.findByStatusAndExpiresAtBefore(CoachingPackStatus.ACTIVE, now).forEach(pack -> {
            pack.setStatus(CoachingPackStatus.EXPIRED);
            packRepository.save(pack);
        });
    }
}
