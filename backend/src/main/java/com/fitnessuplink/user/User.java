package com.fitnessuplink.user;

import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.catalog.Country;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private AppRole appRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "country_id")
    private Country country;

    @Column(name = "onboarding_completed", nullable = false)
    @Builder.Default
    private boolean onboardingCompleted = false;

    @Column(name = "verification_status", nullable = false, length = 16)
    @Builder.Default
    private String verificationStatus = "pending";

    @Column(name = "professional_intent", length = 16)
    private String professionalIntent;

    @Column(name = "profile_visible", nullable = false)
    @Builder.Default
    private boolean profileVisible = false;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "selected_plan", length = 36)
    private String selectedPlan;

    @Column(name = "selected_plan_interval", length = 8)
    private String selectedPlanInterval;

    @Column(name = "pending_plan", length = 36)
    private String pendingPlan;

    @Column(name = "pending_plan_interval", length = 8)
    private String pendingPlanInterval;

    @Column(name = "first_name", nullable = false, length = 80)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 80)
    private String lastName;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "reset_failed_attempts", nullable = false)
    @Builder.Default
    private int resetFailedAttempts = 0;

    @Column(name = "reset_blocked_until")
    private Instant resetBlockedUntil;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void normalize() {
        if (email != null) {
            email = email.trim().toLowerCase(Locale.ROOT);
        }
        if (firstName != null) {
            firstName = firstName.trim();
        }
        if (lastName != null) {
            lastName = lastName.trim();
        }
        displayName = ((firstName == null ? "" : firstName) + " " + (lastName == null ? "" : lastName)).trim();
    }

    public boolean isLocked(Instant now) {
        return lockedUntil != null && now.isBefore(lockedUntil);
    }

    public String roleCode() {
        return appRole == null ? "PENDING" : appRole.getCode();
    }

    public boolean isVerified() {
        return "verified".equals(verificationStatus);
    }

    public boolean isBusiness() {
        return appRole != null && "BUSINESS".equals(appRole.getCategory());
    }

    public boolean isCandidate() {
        return appRole != null && "CANDIDATE".equals(appRole.getCode());
    }

    public boolean isMember() {
        return appRole != null && "MEMBER".equals(appRole.getCode());
    }

    public boolean hasSelectedPlan() {
        return selectedPlan != null && !selectedPlan.isBlank();
    }

    public boolean hasPendingPlan() {
        return pendingPlan != null && !pendingPlan.isBlank();
    }

    public boolean isSuperAdmin() {
        return appRole != null && "SUPER_ADMIN".equals(appRole.getCode());
    }
}
