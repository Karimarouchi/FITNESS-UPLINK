package com.fitnessuplink.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "billing_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingPlan {
    @Id
    private UUID id;
    @Column(name = "family_id", nullable = false)
    private UUID familyId;
    @Column(nullable = false, length = 32)
    private String code;
    @Column(nullable = false, length = 80)
    private String name;
    private String tagline;
    @Column(nullable = false)
    private boolean featured;
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
    @Column(nullable = false)
    private boolean active;
    @Column(name = "trial_days", nullable = false)
    private int trialDays;
}
