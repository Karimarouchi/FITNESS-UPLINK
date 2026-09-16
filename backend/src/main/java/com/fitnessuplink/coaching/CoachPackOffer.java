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
@Table(name = "coach_pack_offers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoachPackOffer {
    @Id
    private UUID id;
    @Column(name = "coach_id", nullable = false)
    private UUID coachId;
    @Enumerated(EnumType.STRING)
    @Column(name = "pack_type", nullable = false, length = 16)
    private CoachPackType packType;
    @Column(name = "session_count")
    private Integer sessionCount;
    @Column(name = "price_amount", nullable = false)
    private BigDecimal priceAmount;
    @Column(name = "price_currency", nullable = false, length = 3)
    private String priceCurrency;
    @Column(name = "validity_days")
    private Integer validityDays;
    @Column(nullable = false)
    private boolean active;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
