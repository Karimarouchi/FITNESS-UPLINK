package com.fitnessuplink.contracts;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ContractSignerRepository extends JpaRepository<ContractSigner, UUID> {

    List<ContractSigner> findByContractIdOrderBySigningOrderAsc(UUID contractId);

    List<ContractSigner> findByContractIdIn(Iterable<UUID> contractIds);
}
