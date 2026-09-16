package com.fitnessuplink.auth.mail;

import com.fitnessuplink.auth.mail.dto.MailSettingsDto;
import com.fitnessuplink.auth.mail.dto.UpdateMailSettingsRequest;
import com.fitnessuplink.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Properties;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MailSettingsService {

    private final MailSettingsRepository mailSettingsRepository;
    private final MailProperties mailProperties;
    private final MailSecretEncryptor mailSecretEncryptor;
    private final Environment environment;

    public EffectiveMailSettings effective() {
        MailSettings stored = mailSettingsRepository.findById(MailSettings.SINGLETON_ID).orElse(null);
        String envHost = environment.getProperty("spring.mail.host", "smtp.gmail.com");
        int envPort = environment.getProperty("spring.mail.port", Integer.class, 587);
        String envUser = blankToNull(environment.getProperty("spring.mail.username"));
        String envPassword = blankToNull(environment.getProperty("spring.mail.password"));
        if (envPassword != null) {
            envPassword = envPassword.replace(" ", "");
        }

        String fromName = stored != null && notBlank(stored.getFromName()) ? stored.getFromName() : mailProperties.fromName();
        String fromEmail = stored != null && notBlank(stored.getFromEmail()) ? stored.getFromEmail() : defaultFromEmail(envUser);
        String host = stored != null && notBlank(stored.getSmtpHost()) ? stored.getSmtpHost().trim() : envHost;
        int port = stored != null && stored.getSmtpPort() != null ? stored.getSmtpPort() : envPort;
        String username = stored != null && notBlank(stored.getSmtpUsername()) ? stored.getSmtpUsername().trim() : envUser;
        String dbPassword = stored == null ? null : mailSecretEncryptor.decrypt(stored.getSmtpPasswordEnc());
        String password = notBlank(dbPassword) ? dbPassword.replace(" ", "") : envPassword;
        boolean usingEnvSmtp = stored == null || !notBlank(stored.getSmtpHost());
        return new EffectiveMailSettings(
                fromName,
                fromEmail,
                host,
                port,
                username == null ? "" : username,
                password == null ? "" : password,
                notBlank(password),
                usingEnvSmtp
        );
    }

    public MailSettingsDto toDto() {
        EffectiveMailSettings settings = effective();
        return new MailSettingsDto(
                settings.fromName(),
                settings.fromEmail(),
                settings.host() == null ? "" : settings.host(),
                settings.port(),
                settings.username(),
                settings.passwordConfigured(),
                settings.usingEnvSmtp()
        );
    }

    @Transactional
    public MailSettingsDto update(UpdateMailSettingsRequest request, UUID actorId) {
        MailSettings stored = mailSettingsRepository.findById(MailSettings.SINGLETON_ID)
                .orElseGet(() -> MailSettings.builder().id(MailSettings.SINGLETON_ID).build());
        stored.setFromName(request.fromName().trim());
        stored.setFromEmail(request.fromEmail().trim().toLowerCase());
        stored.setSmtpHost(blankToNull(request.smtpHost()));
        stored.setSmtpPort(request.smtpPort());
        stored.setSmtpUsername(blankToNull(request.smtpUsername()));
        if (request.smtpPassword() != null && !request.smtpPassword().isBlank()) {
            stored.setSmtpPasswordEnc(mailSecretEncryptor.encrypt(request.smtpPassword().replace(" ", "")));
        }
        stored.setUpdatedAt(Instant.now());
        stored.setUpdatedBy(actorId);
        mailSettingsRepository.save(stored);
        return toDto();
    }

    public EffectiveMailSettings fromUserPrefs(UserMailPrefs prefs) {
        if (prefs == null || !"OWN".equalsIgnoreCase(prefs.getSendMode())) {
            return null;
        }
        String password = mailSecretEncryptor.decrypt(prefs.getSmtpPasswordEnc());
        if (password != null) {
            password = password.replace(" ", "");
        }
        String host = prefs.getSmtpHost() == null ? "" : prefs.getSmtpHost().trim();
        String username = prefs.getSmtpUsername() == null ? "" : prefs.getSmtpUsername().trim();
        String fromEmail = notBlank(prefs.getFromEmail()) ? prefs.getFromEmail().trim() : username;
        String fromName = notBlank(prefs.getFromName()) ? prefs.getFromName().trim() : fromEmail;
        int port = prefs.getSmtpPort() == null ? 587 : prefs.getSmtpPort();
        if (!notBlank(host) || !notBlank(username) || !notBlank(password) || !notBlank(fromEmail)) {
            return null;
        }
        return new EffectiveMailSettings(fromName, fromEmail, host, port, username, password, true, false);
    }

    public JavaMailSender sender() {
        return sender(effective());
    }

    public JavaMailSender sender(EffectiveMailSettings settings) {
        if (settings == null || !settings.passwordConfigured() || settings.host() == null || settings.host().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SMTP n'est pas configuré.");
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(settings.host());
        sender.setPort(settings.port());
        sender.setUsername(settings.username());
        sender.setPassword(settings.password());
        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "8000");
        props.put("mail.smtp.timeout", "8000");
        props.put("mail.smtp.writetimeout", "8000");
        return sender;
    }

    private String defaultFromEmail(String envUser) {
        if (notBlank(mailProperties.fromEmail())) {
            return mailProperties.fromEmail().trim();
        }
        return envUser == null ? "" : envUser;
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
