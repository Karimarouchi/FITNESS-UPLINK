package com.fitnessuplink.talent;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TalentPipelineRepository extends JpaRepository<TalentPipeline, UUID> {

    List<TalentPipeline> findByEmployerIdOrderByUpdatedAtDesc(UUID employerId);

    List<TalentPipeline> findByCandidateIdOrderByUpdatedAtDesc(UUID candidateId);

    List<TalentPipeline> findByEmployerIdAndCandidateIdOrderByUpdatedAtDesc(UUID employerId, UUID candidateId);

    Optional<TalentPipeline> findByIdAndEmployerId(UUID id, UUID employerId);

    Optional<TalentPipeline> findByIdAndCandidateId(UUID id, UUID candidateId);

    boolean existsByEmployerIdAndCandidateId(UUID employerId, UUID candidateId);

    boolean existsByEmployerIdAndCandidateIdAndJobOfferId(UUID employerId, UUID candidateId, UUID jobOfferId);

    boolean existsByEmployerIdAndCandidateIdAndJobOfferIdIsNull(UUID employerId, UUID candidateId);

    long countByJobOfferId(UUID jobOfferId);

    long countByEmployerIdAndStatus(UUID employerId, PipelineStatus status);
}
