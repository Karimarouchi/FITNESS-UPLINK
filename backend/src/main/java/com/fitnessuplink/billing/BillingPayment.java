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
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "billing_payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingPayment {
    @Id
    private UUID id;
    @Column(name = "subscription_id", nullable = false)
    private UUID subscriptionId;
    @Column(nullable = false)
    private BigDecimal amount;
    @Column(nullable = false, length = 3)
    private String currency;
    @Column(name = "vat_rate", nullable = false)
    private BigDecimal vatRate;
    @Column(name = "vat_amount", nullable = false)
    private BigDecimal vatAmount;
    @Column(nullable = false, length = 16)
    private String status;
    @Column(nullable = false, length = 32)
    private String provider;
    @Column(name = "provider_ref")
    private String providerRef;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
