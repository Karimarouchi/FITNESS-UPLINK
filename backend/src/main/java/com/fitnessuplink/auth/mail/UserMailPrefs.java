package com.fitnessuplink.auth.mail;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_mail_prefs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMailPrefs {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "send_mode", nullable = false, length = 16)
    private String sendMode;

    @Column(name = "contact_subject", columnDefinition = "TEXT")
    private String contactSubject;

    @Column(name = "contact_body", columnDefinition = "TEXT")
    private String contactBody;

    @Column(name = "message_subject", columnDefinition = "TEXT")
    private String messageSubject;

    @Column(name = "message_body", columnDefinition = "TEXT")
    private String messageBody;

    @Column(name = "from_name", length = 120)
    private String fromName;

    @Column(name = "from_email", length = 255)
    private String fromEmail;

    @Column(name = "smtp_host")
    private String smtpHost;

    @Column(name = "smtp_port")
    private Integer smtpPort;

    @Column(name = "smtp_username")
    private String smtpUsername;

    @Column(name = "smtp_password_enc", columnDefinition = "TEXT")
    private String smtpPasswordEnc;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
