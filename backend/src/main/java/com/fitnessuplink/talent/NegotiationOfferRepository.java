package com.fitnessuplink.talent;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NegotiationOfferRepository extends JpaRepository<NegotiationOffer, UUID> {

    List<NegotiationOffer> findByRecruitmentIdOrderByCreatedAtAsc(UUID recruitmentId);

    List<NegotiationOffer> findByRecruitmentIdAndStatus(UUID recruitmentId, String status);

    Optional<NegotiationOffer> findByIdAndRecruitmentId(UUID id, UUID recruitmentId);

    long countByRecruitmentId(UUID recruitmentId);
}
