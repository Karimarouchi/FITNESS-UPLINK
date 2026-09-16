package com.fitnessuplink.academy;

import com.fitnessuplink.auth.mail.MailPurpose;
import com.fitnessuplink.auth.mail.MailService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.notifications.UserNotifyPrefsService;
import com.fitnessuplink.user.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Slf4j
@Service
public class AcademyMailService {

    private static final DateTimeFormatter WHEN_FORMAT =
            DateTimeFormatter.ofPattern("EEEE d MMMM 'à' HH:mm", Locale.FRENCH).withZone(ZoneOffset.UTC);

    private final MailService mailService;
    private final UserNotifyPrefsService userNotifyPrefsService;
    private final TaskExecutor mailExecutor;

    public AcademyMailService(
            MailService mailService,
            UserNotifyPrefsService userNotifyPrefsService,
            @Qualifier("mailExecutor") TaskExecutor mailExecutor
    ) {
        this.mailService = mailService;
        this.userNotifyPrefsService = userNotifyPrefsService;
        this.mailExecutor = mailExecutor;
    }

    public void enqueueRegistrationConfirmed(User member, String formationTitle, Instant scheduledAt) {
        if (!userNotifyPrefsService.allowsEmail(member.getId(), NotifyCategory.CONTACT)) {
            return;
        }
        String subject = "Inscription confirmée : " + formationTitle;
        String body = html(
                "Bonjour " + escape(first(member)) + ",<br><br>"
                        + "Votre inscription à « " + escape(formationTitle) + " » est confirmée pour le "
                        + WHEN_FORMAT.format(scheduledAt) + " (heure UTC).<br><br>"
                        + "Connectez-vous à Fitness Uplink pour voir les détails."
        );
        enqueue(member.getEmail(), subject, body, MailPurpose.ACADEMY_REGISTRATION_CONFIRMED);
    }

    public void enqueueWaitlistPromoted(User member, String formationTitle, Instant scheduledAt) {
        if (!userNotifyPrefsService.allowsEmail(member.getId(), NotifyCategory.CONTACT)) {
            return;
        }
        String subject = "Une place s'est libérée : " + formationTitle;
        String body = html(
                "Bonjour " + escape(first(member)) + ",<br><br>"
                        + "Une place s'est libérée pour « " + escape(formationTitle) + " » le "
                        + WHEN_FORMAT.format(scheduledAt) + " (heure UTC). Connectez-vous pour confirmer votre place."
        );
        enqueue(member.getEmail(), subject, body, MailPurpose.ACADEMY_WAITLIST_PROMOTED);
    }

    private void enqueue(String toEmail, String subject, String body, MailPurpose purpose) {
        Runnable send = () -> {
            try {
                mailService.sendQuiet(toEmail, subject, body, purpose);
            } catch (Exception ex) {
                log.warn("event=academy_mail_skipped purpose={}", purpose);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    mailExecutor.execute(send);
                }
            });
            return;
        }
        mailExecutor.execute(send);
    }

    private String first(User user) {
        if (user.getFirstName() != null && !user.getFirstName().isBlank()) {
            return user.getFirstName();
        }
        return user.getDisplayName();
    }

    private String html(String body) {
        return """
                <div style="font-family:Inter,Arial,sans-serif;background:#f4f5f1;padding:32px;">
                  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e4e6de;padding:32px;">
                    <p style="margin:0 0 8px;letter-spacing:.12em;text-transform:uppercase;font-size:12px;color:#5b6178;">Fitness Uplink</p>
                    <div style="color:#141a32;line-height:1.55;font-size:15px;">%s</div>
                  </div>
                </div>
                """.formatted(body);
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
