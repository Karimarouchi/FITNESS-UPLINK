package com.fitnessuplink.jobs;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobOfferRepository extends JpaRepository<JobOffer, UUID> {

    List<JobOffer> findByEmployerIdOrderByUpdatedAtDesc(UUID employerId);

    Optional<JobOffer> findByIdAndEmployerId(UUID id, UUID employerId);
}
