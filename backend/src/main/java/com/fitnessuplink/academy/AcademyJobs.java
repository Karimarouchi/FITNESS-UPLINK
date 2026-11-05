package com.fitnessuplink.academy;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class AcademyJobs {

    private final FormationSessionRepository sessionRepository;
    private final FormationRegistrationRepository registrationRepository;
    private final FormationRepository formationRepository;
    private final FormationRegistrationService registrationService;

    @Scheduled(cron = "0 */10 * * * *")
    @Transactional
    public void completePastSessions() {
        Instant now = Instant.now();
        sessionRepository.findByStatusAndScheduledAtBefore(FormationSessionStatus.SCHEDULED, now).stream()
                .filter(session -> session.endsAt().isBefore(now))
                .forEach(session -> {
                    session.setStatus(FormationSessionStatus.COMPLETED);
                    session.setUpdatedAt(now);
                    sessionRepository.save(session);
                    registrationService.markNoShows(session);
                });
    }

    /** Online seats are held for 5 minutes: free them as soon as the window ends. */
    @Scheduled(cron = "0 * * * * *")
    public void expireHolds() {
        registrationService.expireHolds();
    }
}
