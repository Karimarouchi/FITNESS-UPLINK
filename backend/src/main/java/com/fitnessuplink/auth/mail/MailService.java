package com.fitnessuplink.auth.mail;

import com.fitnessuplink.auth.EmailCodePurpose;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import java.nio.charset.StandardCharsets;

@Slf4j
@Service
public class MailService {

    private final MailSettingsService mailSettingsService;
    private final MailEventService mailEventService;
    private final TaskExecutor mailExecutor;

    public MailService(
            MailSettingsService mailSettingsService,
            MailEventService mailEventService,
            @Qualifier("mailExecutor") TaskExecutor mailExecutor
    ) {
        this.mailSettingsService = mailSettingsService;
        this.mailEventService = mailEventService;
        this.mailExecutor = mailExecutor;
    }

    public void sendCode(User user, EmailCodePurpose purpose, String code) {
        sendCode(user.getEmail(), user.getFirstName(), purpose, code);
    }

    public void sendCode(String toEmail, String firstName, EmailCodePurpose purpose, String code) {
        MailPurpose mailPurpose = purpose == EmailCodePurpose.RESET_PASSWORD
                ? MailPurpose.RESET_PASSWORD
                : MailPurpose.VERIFY_EMAIL;
        String subject = mailPurpose == MailPurpose.RESET_PASSWORD
                ? "Votre code de réinitialisation Fitness Uplink"
                : "Votre code de vérification Fitness Uplink";
        String intro = mailPurpose == MailPurpose.RESET_PASSWORD
                ? "Utilisez ce code pour réinitialiser votre mot de passe :"
                : "Utilisez ce code pour vérifier votre adresse email :";
        String html = """
                <div style="font-family:Inter,Arial,sans-serif;background:#f4f1ea;padding:32px;">
                  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e1d8;padding:32px;">
                    <p style="margin:0 0 8px;letter-spacing:.12em;text-transform:uppercase;font-size:12px;color:#6b665c;">Fitness Uplink</p>
                    <h1 style="margin:0 0 16px;font-size:24px;color:#1a1915;">Bonjour %s,</h1>
                    <p style="margin:0 0 20px;color:#3f3c36;line-height:1.5;">%s</p>
                    <p style="margin:0 0 24px;font-size:32px;letter-spacing:.28em;font-weight:700;color:#1a1915;text-align:center;">%s</p>
                    <p style="margin:0;color:#6b665c;font-size:13px;">Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
                  </div>
                </div>
                """.formatted(escape(firstName), intro, code);
        send(toEmail, subject, html, mailPurpose, true, null);
    }

    public void enqueueWelcome(User user) {
        String email = user.getEmail();
        String firstName = user.getFirstName();
        Runnable send = () -> sendWelcomeQuietly(email, firstName);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    mailExecutor.execute(send);
                }
            });
            return;
        }
        send.run();
    }

    public void sendWelcomeQuietly(String toEmail, String firstName) {
        try {
            sendWelcome(toEmail, firstName);
        } catch (Exception ex) {
            log.warn("event=mail_welcome_skipped recipient={}", MailAddressMasker.mask(toEmail));
        }
    }

    public void sendWelcome(String toEmail, String firstName) {
        String html = """
                <div style="font-family:Inter,Arial,sans-serif;background:#f4f1ea;padding:32px;">
                  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e1d8;padding:32px;">
                    <p style="margin:0 0 8px;letter-spacing:.12em;text-transform:uppercase;font-size:12px;color:#6b665c;">Fitness Uplink</p>
                    <h1 style="margin:0 0 16px;font-size:24px;color:#1a1915;">Bienvenue %s,</h1>
                    <p style="margin:0 0 20px;color:#3f3c36;line-height:1.5;">Votre email est confirmé. Vous pouvez continuer votre inscription et rejoindre le réseau Fitness Uplink.</p>
                    <p style="margin:0;color:#6b665c;font-size:13px;">Si vous n'êtes pas à l'origine de ce compte, ignorez cet email.</p>
                  </div>
                </div>
                """.formatted(escape(firstName));
        send(toEmail, "Bienvenue sur Fitness Uplink", html, MailPurpose.WELCOME, false, null);
    }

    public void sendQuiet(String toEmail, String subject, String html, MailPurpose purpose) {
        send(toEmail, subject, html, purpose, false, null);
    }

    public void sendQuiet(String toEmail, String subject, String html, MailPurpose purpose, EffectiveMailSettings override) {
        send(toEmail, subject, html, purpose, false, override);
    }

    public void sendTest(String toEmail) {
        String html = """
                <div style="font-family:Inter,Arial,sans-serif;background:#f4f1ea;padding:32px;">
                  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e1d8;padding:32px;">
                    <p style="margin:0 0 8px;letter-spacing:.12em;text-transform:uppercase;font-size:12px;color:#6b665c;">Fitness Uplink</p>
                    <h1 style="margin:0 0 16px;font-size:24px;color:#1a1915;">Test SMTP</h1>
                    <p style="margin:0;color:#3f3c36;line-height:1.5;">Si vous lisez ceci, l'envoi d'emails fonctionne avec la configuration actuelle.</p>
                  </div>
                </div>
                """;
        send(toEmail, "Test d'envoi Fitness Uplink", html, MailPurpose.TEST, true, null);
    }

    private void send(
            String to,
            String subject,
            String html,
            MailPurpose purpose,
            boolean throwOnError,
            EffectiveMailSettings override
    ) {
        long started = System.currentTimeMillis();
        try {
            EffectiveMailSettings settings = override == null ? mailSettingsService.effective() : override;
            JavaMailSender mailSender = mailSettingsService.sender(settings);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(settings.fromEmail(), settings.fromName(), StandardCharsets.UTF_8.name()));
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            persistEvent(purpose, MailEventStatus.SENT, to, null, null, started);
        } catch (ApiException ex) {
            persistEvent(
                    purpose,
                    MailEventStatus.FAILED,
                    to,
                    "SMTP_UNAVAILABLE",
                    MailAddressMasker.sanitizeError(ex.getMessage()),
                    started
            );
            if (throwOnError) {
                throw ex;
            }
        } catch (Exception ex) {
            persistEvent(
                    purpose,
                    MailEventStatus.FAILED,
                    to,
                    ex.getClass().getSimpleName(),
                    MailAddressMasker.sanitizeError(ex.getMessage()),
                    started
            );
            if (throwOnError) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Impossible d'envoyer l'email. Réessayez dans un instant.");
            }
        }
    }

    private void persistEvent(
            MailPurpose purpose,
            MailEventStatus status,
            String to,
            String errorCode,
            String errorMessage,
            long started
    ) {
        try {
            mailEventService.record(purpose, status, to, errorCode, errorMessage, (int) (System.currentTimeMillis() - started));
        } catch (Exception ex) {
            log.warn("event=mail_event_persist_failed purpose={} status={}", purpose, status);
        }
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
