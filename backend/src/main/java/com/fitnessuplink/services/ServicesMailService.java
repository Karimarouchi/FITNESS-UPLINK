package com.fitnessuplink.services;

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

@Slf4j
@Service
public class ServicesMailService {

    private final MailService mailService;
    private final UserNotifyPrefsService userNotifyPrefsService;
    private final TaskExecutor mailExecutor;

    public ServicesMailService(
            MailService mailService,
            UserNotifyPrefsService userNotifyPrefsService,
            @Qualifier("mailExecutor") TaskExecutor mailExecutor
    ) {
        this.mailService = mailService;
        this.userNotifyPrefsService = userNotifyPrefsService;
        this.mailExecutor = mailExecutor;
    }

    public void enqueueQuoteRequest(User provider, User requester, String companyName, String message) {
        if (!userNotifyPrefsService.allowsEmail(provider.getId(), NotifyCategory.CONTACT)) {
            return;
        }
        String subject = companyName + " demande un devis";
        String body = html(
                "Bonjour " + escape(first(provider)) + ",<br><br>"
                        + escape(companyName) + " (" + escape(requester.getDisplayName()) + ") souhaite un devis :<br><br>"
                        + "«&nbsp;" + escape(message) + "&nbsp;»<br><br>"
                        + "Connectez-vous à Fitness Uplink pour répondre."
        );
        enqueue(provider.getEmail(), subject, body);
    }

    private void enqueue(String toEmail, String subject, String body) {
        Runnable send = () -> {
            try {
                mailService.sendQuiet(toEmail, subject, body, MailPurpose.SERVICE_QUOTE_REQUEST);
            } catch (Exception ex) {
                log.warn("event=services_mail_skipped purpose={}", MailPurpose.SERVICE_QUOTE_REQUEST);
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
