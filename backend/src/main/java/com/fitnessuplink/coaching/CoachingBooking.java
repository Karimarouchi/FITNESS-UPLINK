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
@Table(name = "coaching_bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoachingBooking {
    @Id
    private UUID id;
    @Column(name = "coach_id", nullable = false)
    private UUID coachId;
    @Column(name = "client_id", nullable = false)
    private UUID clientId;
    @Column(name = "coach_service_id", nullable = false)
    private UUID coachServiceId;
    @Column(name = "pack_id")
    private UUID packId;
    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;
    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CoachingBookingStatus status;
    @Column(name = "price_amount", nullable = false)
    private BigDecimal priceAmount;
    @Column(name = "price_currency", nullable = false, length = 3)
    private String priceCurrency;
    @Column(name = "payment_id")
    private UUID paymentId;
    @Column(name = "reminder_sent_at")
    private Instant reminderSentAt;
    @Column(name = "cancelled_reason", length = 200)
    private String cancelledReason;
    @Column(name = "suggested_slots_json", columnDefinition = "TEXT")
    private String suggestedSlotsJson;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Instant endsAt() {
        return scheduledAt.plusSeconds(durationMinutes * 60L);
    }
}
