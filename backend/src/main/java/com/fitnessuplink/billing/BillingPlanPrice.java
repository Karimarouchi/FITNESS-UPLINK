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

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "billing_plan_prices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingPlanPrice {
    @Id
    private UUID id;
    @Column(name = "plan_id", nullable = false)
    private UUID planId;
    @Column(nullable = false, length = 3)
    private String currency;
    @Column(nullable = false, length = 8)
    private String interval;
    @Column(nullable = false)
    private BigDecimal amount;
}
