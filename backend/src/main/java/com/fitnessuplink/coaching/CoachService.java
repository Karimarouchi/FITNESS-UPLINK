package com.fitnessuplink.coaching;

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
@Table(name = "coach_services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoachService {
    @Id
    private UUID id;
    @Column(name = "coach_id", nullable = false)
    private UUID coachId;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;
    @Column(name = "price_amount", nullable = false)
    private BigDecimal priceAmount;
    @Column(name = "price_currency", nullable = false, length = 3)
    private String priceCurrency;
    @Column(nullable = false)
    private boolean active;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
