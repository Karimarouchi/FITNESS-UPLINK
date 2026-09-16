package com.fitnessuplink.auth.mail;

import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.notifications.UserNotifyPrefsService;
import com.fitnessuplink.user.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Map;

@Slf4j
@Service
public class HireMailService {

    private final MailService mailService;
    private final MailTemplateRepository mailTemplateRepository;
    private final UserMailPrefsRepository userMailPrefsRepository;
    private final MailSettingsService mailSettingsService;
    private final UserNotifyPrefsService userNotifyPrefsService;
    private final TaskExecutor mailExecutor;

    public HireMailService(
            MailService mailService,
            MailTemplateRepository mailTemplateRepository,
            UserMailPrefsRepository userMailPrefsRepository,
            MailSettingsService mailSettingsService,
            UserNotifyPrefsService userNotifyPrefsService,
            @Qualifier("mailExecutor") TaskExecutor mailExecutor
    ) {
        this.mailService = mailService;
        this.mailTemplateRepository = mailTemplateRepository;
        this.userMailPrefsRepository = userMailPrefsRepository;
        this.mailSettingsService = mailSettingsService;
        this.userNotifyPrefsService = userNotifyPrefsService;
        this.mailExecutor = mailExecutor;
    }

    public void enqueueContacted(User candidate, User employer, String offerTitle) {
        enqueue(
                candidate,
                MailPurpose.HIRE_CONTACTED,
                Map.of(
                        "prenom", first(candidate),
                        "etablissement", employer.getDisplayName(),
                        "offre", offerTitle == null || offerTitle.isBlank() ? "un recrutement" : offerTitle,
                        "expediteur", employer.getDisplayName()
                ),
                employer
        );
    }

    public void enqueueMessage(User recipient, User sender, String excerpt) {
        enqueue(
                recipient,
                MailPurpose.HIRE_MESSAGE,
                Map.of(
                        "prenom", first(recipient),
                        "expediteur", sender.getDisplayName(),
                        "extrait", excerpt == null ? "" : excerpt,
                        "etablissement", sender.getDisplayName(),
                        "offre", ""
                ),
                sender.isBusiness() ? sender : null
        );
    }

    public void enqueueInterview(
            User candidate,
            User employer,
            String offerTitle,
            String date,
            String time,
            String mode,
            String placeLabel,
            String place
    ) {
        enqueue(
                candidate,
                MailPurpose.HIRE_INTERVIEW,
                Map.of(
                        "prenom", first(candidate),
                        "etablissement", employer.getDisplayName(),
                        "offre", offerTitle == null || offerTitle.isBlank() ? "un recrutement" : offerTitle,
                        "date", date == null ? "" : date,
                        "heure", time == null ? "" : time,
                        "mode", mode == null ? "" : mode,
                        "lieu_label", placeLabel == null ? "Lieu" : placeLabel,
                        "lieu", place == null ? "" : place,
                        "expediteur", employer.getDisplayName()
                ),
                employer
        );
    }

    public void enqueueDocumentRejected(User user, String section, String reason) {
        enqueue(
                user,
                MailPurpose.DOCUMENT_REJECTED,
                Map.of(
                        "prenom", first(user),
                        "section", section,
                        "motif", reason == null ? "" : reason,
                        "etablissement", "",
                        "offre", "",
                        "expediteur", "Fitness Uplink"
                ),
                null
        );
    }

    public void enqueueDocumentVerified(User user, String section) {
        enqueue(
                user,
                MailPurpose.DOCUMENT_VERIFIED,
                Map.of(
                        "prenom", first(user),
                        "section", section,
                        "motif", "",
                        "etablissement", "",
                        "offre", "",
                        "expediteur", "Fitness Uplink"
                ),
                null
        );
    }

    private void enqueue(User to, MailPurpose purpose, Map<String, String> vars, User employer) {
        NotifyCategory category = categoryOf(purpose);
        if (category != null && !userNotifyPrefsService.allowsEmail(to.getId(), category)) {
            return;
        }
        String email = to.getEmail();
        Runnable send = () -> {
            try {
                MailTemplate template = mailTemplateRepository.findById(purpose).orElse(null);
                String subject = fill(overrideSubject(purpose, employer, template), vars);
                String body = fill(overrideBody(purpose, employer, template), vars);
                UserMailPrefs prefs = employer == null ? null : userMailPrefsRepository.findById(employer.getId()).orElse(null);
                mailService.sendQuiet(email, subject, html(body), purpose, mailSettingsService.fromUserPrefs(prefs));
            } catch (Exception ex) {
                log.warn("event=hire_mail_skipped purpose={} recipient={}", purpose, MailAddressMasker.mask(email));
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

    private String overrideSubject(MailPurpose purpose, User employer, MailTemplate template) {
        UserMailPrefs prefs = employer == null ? null : userMailPrefsRepository.findById(employer.getId()).orElse(null);
        if (purpose == MailPurpose.HIRE_CONTACTED && notBlank(prefs == null ? null : prefs.getContactSubject())) {
            return prefs.getContactSubject();
        }
        if (purpose == MailPurpose.HIRE_MESSAGE && notBlank(prefs == null ? null : prefs.getMessageSubject())) {
            return prefs.getMessageSubject();
        }
        return template == null ? defaultSubject(purpose) : template.getSubject();
    }

    private String overrideBody(MailPurpose purpose, User employer, MailTemplate template) {
        UserMailPrefs prefs = employer == null ? null : userMailPrefsRepository.findById(employer.getId()).orElse(null);
        if (purpose == MailPurpose.HIRE_CONTACTED && notBlank(prefs == null ? null : prefs.getContactBody())) {
            return prefs.getContactBody();
        }
        if (purpose == MailPurpose.HIRE_MESSAGE && notBlank(prefs == null ? null : prefs.getMessageBody())) {
            return prefs.getMessageBody();
        }
        return template == null ? defaultBody(purpose) : template.getBody();
    }

    private String defaultSubject(MailPurpose purpose) {
        return switch (purpose) {
            case HIRE_CONTACTED -> "{{etablissement}} souhaite échanger avec vous";
            case HIRE_MESSAGE -> "Nouveau message de {{expediteur}}";
            case HIRE_INTERVIEW -> "Entretien prévu avec {{etablissement}}";
            case DOCUMENT_REJECTED -> "Document refusé : {{section}}";
            case DOCUMENT_VERIFIED -> "Document validé : {{section}}";
            default -> "Fitness Uplink";
        };
    }

    private String defaultBody(MailPurpose purpose) {
        return switch (purpose) {
            case HIRE_CONTACTED -> "Bonjour {{prenom}},\n\n{{etablissement}} vous a contacté pour {{offre}}. Connectez-vous à Fitness Uplink pour répondre.";
            case HIRE_MESSAGE -> "Bonjour {{prenom}},\n\n{{expediteur}} vous a écrit :\n\n{{extrait}}";
            case HIRE_INTERVIEW -> "Bonjour {{prenom}},\n\n{{etablissement}} vous convie à un entretien pour {{offre}}.\n\nDate : {{date}}\nHeure : {{heure}}\nMode : {{mode}}\n{{lieu_label}} : {{lieu}}";
            case DOCUMENT_REJECTED -> "Bonjour {{prenom}},\n\nLa section « {{section}} » a été refusée.\n\nMotif : {{motif}}";
            case DOCUMENT_VERIFIED -> "Bonjour {{prenom}},\n\nLa section « {{section}} » a été validée.";
            default -> "Fitness Uplink";
        };
    }

    private String fill(String text, Map<String, String> vars) {
        String out = text == null ? "" : text;
        for (Map.Entry<String, String> entry : vars.entrySet()) {
            out = out.replace("{{" + entry.getKey() + "}}", entry.getValue() == null ? "" : entry.getValue());
        }
        return out;
    }

    private String html(String body) {
        String escaped = escape(body).replace("\n", "<br>");
        return """
                <div style="font-family:Inter,Arial,sans-serif;background:#f4f5f1;padding:32px;">
                  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e4e6de;padding:32px;">
                    <p style="margin:0 0 8px;letter-spacing:.12em;text-transform:uppercase;font-size:12px;color:#5b6178;">Fitness Uplink</p>
                    <div style="color:#141a32;line-height:1.55;font-size:15px;">%s</div>
                  </div>
                </div>
                """.formatted(escaped);
    }

    private static NotifyCategory categoryOf(MailPurpose purpose) {
        return switch (purpose) {
            case HIRE_CONTACTED, HIRE_INTERVIEW -> NotifyCategory.CONTACT;
            case HIRE_MESSAGE -> NotifyCategory.MESSAGE;
            case DOCUMENT_REJECTED, DOCUMENT_VERIFIED -> NotifyCategory.DOCUMENT;
            default -> null;
        };
    }

    private String first(User user) {
        if (user.getFirstName() != null && !user.getFirstName().isBlank()) {
            return user.getFirstName();
        }
        return user.getDisplayName();
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
