package com.fitnessuplink.marketplace;

import com.fitnessuplink.auth.mail.MailPurpose;
import com.fitnessuplink.auth.mail.MailService;
import com.fitnessuplink.common.config.FrontendProperties;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.notifications.UserNotifyPrefsService;
import com.fitnessuplink.user.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Slf4j
@Service
public class MarketplaceMailService {

    private final MailService mailService;
    private final UserNotifyPrefsService userNotifyPrefsService;
    private final FrontendProperties frontendProperties;
    private final TaskExecutor mailExecutor;

    public MarketplaceMailService(
            MailService mailService,
            UserNotifyPrefsService userNotifyPrefsService,
            FrontendProperties frontendProperties,
            @Qualifier("mailExecutor") TaskExecutor mailExecutor
    ) {
        this.mailService = mailService;
        this.userNotifyPrefsService = userNotifyPrefsService;
        this.frontendProperties = frontendProperties;
        this.mailExecutor = mailExecutor;
    }

    public void sendGuestVerification(String email, String fullName, String productName, UUID requestId, String code) {
        String link = frontendProperties.baseUrl() + "/marketplace/quote/confirm?requestId=" + requestId + "&code=" + code;
        String subject = "Confirmez votre demande de devis";
        String body = html(
                "Bonjour " + escape(fullName) + ",<br><br>"
                        + "Confirmez votre demande de devis pour « " + escape(productName) + " » avec le code ci-dessous, "
                        + "ou en cliquant sur le lien (utile si vous avez ouvert cet e-mail sur un autre appareil) :<br><br>"
                        + "<p style=\"font-size:28px;font-weight:700;letter-spacing:6px;\">" + escape(code) + "</p>"
                        + "<a href=\"" + link + "\">Confirmer ma demande</a><br><br>"
                        + "Ce code expire dans 10 minutes."
        );
        enqueue(email, subject, body);
    }

    public void notifySupplier(User supplier, String requesterName, String productName) {
        if (!userNotifyPrefsService.allowsEmail(supplier.getId(), NotifyCategory.CONTACT)) {
            return;
        }
        String subject = "Nouvelle demande de devis — " + productName;
        String body = html(
                "Bonjour " + escape(first(supplier)) + ",<br><br>"
                        + escape(requesterName) + " souhaite un devis pour « " + escape(productName) + " ».<br><br>"
                        + "Connectez-vous à Fitness Uplink pour voir les détails."
        );
        enqueue(supplier.getEmail(), subject, body);
    }

    private void enqueue(String toEmail, String subject, String body) {
        Runnable send = () -> {
            try {
                mailService.sendQuiet(toEmail, subject, body, MailPurpose.MARKETPLACE_QUOTE_REQUEST);
            } catch (Exception ex) {
                log.warn("event=marketplace_mail_skipped purpose={}", MailPurpose.MARKETPLACE_QUOTE_REQUEST);
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
                  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e4e6de;padding:32px;text-align:center;">
                    <p style="margin:0 0 8px;letter-spacing:.12em;text-transform:uppercase;font-size:12px;color:#5b6178;">Fitness Uplink</p>
                    <div style="color:#141a32;line-height:1.55;font-size:15px;text-align:left;">%s</div>
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
