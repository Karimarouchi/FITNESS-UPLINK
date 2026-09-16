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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "coach_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoachSettings {
    @Id
    @Column(name = "coach_id")
    private UUID coachId;
    @Column(name = "cancellation_deadline_hours", nullable = false)
    private int cancellationDeadlineHours;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
