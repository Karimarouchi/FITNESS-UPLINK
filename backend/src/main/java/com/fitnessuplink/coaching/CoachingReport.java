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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "coaching_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoachingReport {
    @Id
    private UUID id;
    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;
    @Column(name = "reporter_id", nullable = false)
    private UUID reporterId;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CoachingReportStatus status;
    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "resolved_at")
    private Instant resolvedAt;
}
