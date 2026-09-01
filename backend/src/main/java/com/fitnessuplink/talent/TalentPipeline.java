package com.fitnessuplink.talent;

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
@Table(name = "talent_pipeline")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TalentPipeline {

    @Id
    private UUID id;

    @Column(name = "employer_id", nullable = false)
    private UUID employerId;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "job_offer_id")
    private UUID jobOfferId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PipelineStatus status;

    @Column(name = "internal_note", columnDefinition = "TEXT")
    private String internalNote;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "status_updated_at", nullable = false)
    private Instant statusUpdatedAt;
}
