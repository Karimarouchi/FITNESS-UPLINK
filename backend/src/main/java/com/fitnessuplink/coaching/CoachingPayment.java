package com.fitnessuplink.coaching;

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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "coaching_payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoachingPayment {
    @Id
    private UUID id;
    @Column(name = "client_id", nullable = false)
    private UUID clientId;
    @Column(name = "coach_id", nullable = false)
    private UUID coachId;
    @Column(name = "booking_id")
    private UUID bookingId;
    @Column(name = "pack_id")
    private UUID packId;
    @Column(nullable = false)
    private BigDecimal amount;
    @Column(nullable = false, length = 3)
    private String currency;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CoachingPaymentStatus status;
    @Column(nullable = false, length = 32)
    private String provider;
    @Column(name = "provider_ref", length = 80)
    private String providerRef;
    @Column(name = "invoice_number", nullable = false, length = 32)
    private String invoiceNumber;
    @Column(name = "invoice_html", nullable = false, columnDefinition = "TEXT")
    private String invoiceHtml;
    @Column(name = "commission_rate", nullable = false)
    private BigDecimal commissionRate;
    @Column(name = "commission_amount", nullable = false)
    private BigDecimal commissionAmount;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
