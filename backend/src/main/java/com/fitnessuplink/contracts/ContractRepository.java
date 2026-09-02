package com.fitnessuplink.contracts;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContractRepository extends JpaRepository<Contract, UUID> {

    List<Contract> findByEmployerIdOrderByUpdatedAtDesc(UUID employerId);

    List<Contract> findByCandidateIdOrderByUpdatedAtDesc(UUID candidateId);

    List<Contract> findByRecruitmentIdIn(Collection<UUID> recruitmentIds);

    List<Contract> findByRecruitmentIdOrderByCreatedAtDesc(UUID recruitmentId);

    Optional<Contract> findByIdAndEmployerId(UUID id, UUID employerId);

    Optional<Contract> findByIdAndCandidateId(UUID id, UUID candidateId);

    Optional<Contract> findByExternalSignatureRequestId(String externalSignatureRequestId);

    boolean existsByRecruitmentIdAndStatus(UUID recruitmentId, ContractStatus status);
}
