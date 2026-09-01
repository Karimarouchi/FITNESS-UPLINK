package com.fitnessuplink.talent;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CandidateFavoriteRepository extends JpaRepository<CandidateFavorite, CandidateFavoriteId> {

    boolean existsByEmployerIdAndCandidateId(UUID employerId, UUID candidateId);

    void deleteByEmployerIdAndCandidateId(UUID employerId, UUID candidateId);

    List<CandidateFavorite> findByEmployerIdOrderByCreatedAtDesc(UUID employerId);
}
