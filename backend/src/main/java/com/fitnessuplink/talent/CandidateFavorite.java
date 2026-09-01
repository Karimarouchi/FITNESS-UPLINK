package com.fitnessuplink.talent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "candidate_favorites")
@IdClass(CandidateFavoriteId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CandidateFavorite {

    @Id
    @Column(name = "employer_id", nullable = false)
    private UUID employerId;

    @Id
    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
