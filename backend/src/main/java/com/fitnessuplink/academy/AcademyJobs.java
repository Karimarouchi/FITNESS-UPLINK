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
                });
    }

    @Scheduled(cron = "0 */10 * * * *")
    @Transactional
    public void expireUnresolvedRegistrations() {
        Instant now = Instant.now();
        registrationRepository.findByStatus(FormationRegistrationStatus.PENDING_PAYMENT).forEach(registration -> {
            FormationSession session = sessionRepository.findById(registration.getSessionId()).orElse(null);
            if (session == null || session.getScheduledAt().isAfter(now)) {
                return;
            }
            Formation formation = formationRepository.findById(session.getFormationId()).orElse(null);
            registration.setStatus(FormationRegistrationStatus.CANCELLED);
            registration.setUpdatedAt(now);
            registrationRepository.save(registration);
            if (formation != null) {
                registrationService.promoteNextWaitlisted(session, formation);
            }
        });
    }
}
