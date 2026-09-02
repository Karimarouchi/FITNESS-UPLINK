package com.fitnessuplink.contracts;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ContractHistoryRepository extends JpaRepository<ContractHistory, UUID> {

    List<ContractHistory> findByContractIdOrderByCreatedAtAsc(UUID contractId);
}
