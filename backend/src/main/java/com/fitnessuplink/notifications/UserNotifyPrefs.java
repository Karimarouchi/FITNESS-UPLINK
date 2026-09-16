package com.fitnessuplink.notifications;

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
@Table(name = "user_notify_prefs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserNotifyPrefs {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "in_app_contact", nullable = false)
    @Builder.Default
    private boolean inAppContact = true;

    @Column(name = "email_contact", nullable = false)
    @Builder.Default
    private boolean emailContact = true;

    @Column(name = "in_app_message", nullable = false)
    @Builder.Default
    private boolean inAppMessage = true;

    @Column(name = "email_message", nullable = false)
    @Builder.Default
    private boolean emailMessage = true;

    @Column(name = "in_app_application", nullable = false)
    @Builder.Default
    private boolean inAppApplication = true;

    @Column(name = "email_application", nullable = false)
    @Builder.Default
    private boolean emailApplication = true;

    @Column(name = "in_app_document", nullable = false)
    @Builder.Default
    private boolean inAppDocument = true;

    @Column(name = "email_document", nullable = false)
    @Builder.Default
    private boolean emailDocument = true;

    @Column(name = "in_app_contract", nullable = false)
    @Builder.Default
    private boolean inAppContract = true;

    @Column(name = "email_contract", nullable = false)
    @Builder.Default
    private boolean emailContract = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
