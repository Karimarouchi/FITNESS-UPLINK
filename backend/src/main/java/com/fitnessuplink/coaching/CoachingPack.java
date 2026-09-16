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
@Table(name = "coaching_packs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoachingPack {
    @Id
    private UUID id;
    @Column(name = "coach_id", nullable = false)
    private UUID coachId;
    @Column(name = "client_id", nullable = false)
    private UUID clientId;
    @Column(name = "offer_id", nullable = false)
    private UUID offerId;
    @Column(name = "sessions_total", nullable = false)
    private int sessionsTotal;
    @Column(name = "sessions_used", nullable = false)
    private int sessionsUsed;
    @Column(name = "price_amount", nullable = false)
    private BigDecimal priceAmount;
    @Column(name = "price_currency", nullable = false, length = 3)
    private String priceCurrency;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CoachingPackStatus status;
    @Column(name = "purchased_at", nullable = false)
    private Instant purchasedAt;
    @Column(name = "expires_at")
    private Instant expiresAt;
    @Column(name = "payment_id")
    private UUID paymentId;

    public int sessionsRemaining() {
        return Math.max(0, sessionsTotal - sessionsUsed);
    }
}
