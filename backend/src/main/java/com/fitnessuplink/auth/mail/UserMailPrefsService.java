package com.fitnessuplink.auth.mail;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.auth.mail.dto.MailTemplateDto;
import com.fitnessuplink.auth.mail.dto.UpdateUserMailPrefsRequest;
import com.fitnessuplink.auth.mail.dto.UserMailPrefsDto;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserMailPrefsService {

    private final UserMailPrefsRepository userMailPrefsRepository;
    private final MailTemplateRepository mailTemplateRepository;
    private final MailSecretEncryptor mailSecretEncryptor;
    private final PermissionService permissionService;
    private final com.fitnessuplink.billing.EntitlementService entitlementService;

    @Transactional(readOnly = true)
    public UserMailPrefsDto get(User user) {
        permissionService.require(user, Permissions.HIRE_PIPELINE);
        UserMailPrefs prefs = userMailPrefsRepository.findById(user.getId()).orElse(null);
        MailTemplate contact = mailTemplateRepository.findById(MailPurpose.HIRE_CONTACTED).orElse(null);
        MailTemplate message = mailTemplateRepository.findById(MailPurpose.HIRE_MESSAGE).orElse(null);
        return new UserMailPrefsDto(
                prefs == null ? "PLATFORM" : prefs.getSendMode(),
                prefs == null || blank(prefs.getContactSubject()) ? (contact == null ? "" : contact.getSubject()) : prefs.getContactSubject(),
                prefs == null || blank(prefs.getContactBody()) ? (contact == null ? "" : contact.getBody()) : prefs.getContactBody(),
                prefs == null || blank(prefs.getMessageSubject()) ? (message == null ? "" : message.getSubject()) : prefs.getMessageSubject(),
                prefs == null || blank(prefs.getMessageBody()) ? (message == null ? "" : message.getBody()) : prefs.getMessageBody(),
                prefs == null ? "" : nullToEmpty(prefs.getFromName()),
                prefs == null ? "" : nullToEmpty(prefs.getFromEmail()),
                prefs == null ? "" : nullToEmpty(prefs.getSmtpHost()),
                prefs == null ? 587 : prefs.getSmtpPort(),
                prefs == null ? "" : nullToEmpty(prefs.getSmtpUsername()),
                prefs != null && !blank(prefs.getSmtpPasswordEnc())
        );
    }

    @Transactional
    public UserMailPrefsDto update(User user, UpdateUserMailPrefsRequest request) {
        permissionService.require(user, Permissions.HIRE_PIPELINE);
        UserMailPrefs prefs = userMailPrefsRepository.findById(user.getId())
                .orElseGet(() -> UserMailPrefs.builder().userId(user.getId()).sendMode("PLATFORM").build());
        String mode = request.sendMode() == null ? prefs.getSendMode() : request.sendMode().trim().toUpperCase();
        if (!mode.equals("PLATFORM") && !mode.equals("OWN")) {
            mode = "PLATFORM";
        }
        if ("OWN".equals(mode)) {
            entitlementService.require(user, com.fitnessuplink.billing.Entitlements.MAIL_OWN);
        }
        prefs.setSendMode(mode);
        prefs.setContactSubject(blankToNull(request.contactSubject()));
        prefs.setContactBody(blankToNull(request.contactBody()));
        prefs.setMessageSubject(blankToNull(request.messageSubject()));
        prefs.setMessageBody(blankToNull(request.messageBody()));
        prefs.setFromName(blankToNull(request.fromName()));
        prefs.setFromEmail(blankToNull(request.fromEmail()));
        prefs.setSmtpHost(blankToNull(request.smtpHost()));
        prefs.setSmtpPort(request.smtpPort());
        prefs.setSmtpUsername(blankToNull(request.smtpUsername()));
        if (request.smtpPassword() != null && !request.smtpPassword().isBlank()) {
            prefs.setSmtpPasswordEnc(mailSecretEncryptor.encrypt(request.smtpPassword().replace(" ", "")));
        }
        prefs.setUpdatedAt(Instant.now());
        userMailPrefsRepository.save(prefs);
        return get(user);
    }

    @Transactional(readOnly = true)
    public List<MailTemplateDto> templates() {
        return Arrays.stream(MailPurpose.values())
                .filter(purpose -> purpose.name().startsWith("HIRE_") || purpose.name().startsWith("DOCUMENT_"))
                .map(purpose -> {
                    MailTemplate row = mailTemplateRepository.findById(purpose).orElse(null);
                    return new MailTemplateDto(
                            purpose,
                            row == null ? "" : row.getSubject(),
                            row == null ? "" : row.getBody()
                    );
                })
                .toList();
    }

    @Transactional
    public MailTemplateDto saveTemplate(MailTemplateDto dto) {
        MailTemplate row = mailTemplateRepository.findById(dto.purpose()).orElseGet(() -> MailTemplate.builder().purpose(dto.purpose()).build());
        row.setSubject(dto.subject() == null ? "" : dto.subject().trim());
        row.setBody(dto.body() == null ? "" : dto.body());
        row.setUpdatedAt(Instant.now());
        mailTemplateRepository.save(row);
        return new MailTemplateDto(row.getPurpose(), row.getSubject(), row.getBody());
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return blank(value) ? null : value.trim();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
