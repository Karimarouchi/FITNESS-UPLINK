package com.fitnessuplink.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "billing_subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingSubscription {
    @Id
    private UUID id;
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    @Column(name = "plan_id", nullable = false)
    private UUID planId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SubscriptionStatus status;
    @Column(nullable = false, length = 8)
    private String interval;
    @Column(nullable = false, length = 3)
    private String currency;
    @Column(name = "test_card_id")
    private UUID testCardId;
    @Column(name = "card_last4", length = 4)
    private String cardLast4;
    @Column(name = "trial_ends_at")
    private Instant trialEndsAt;
    @Column(name = "current_period_end")
    private Instant currentPeriodEnd;
    @Column(name = "cancelled_at")
    private Instant cancelledAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
