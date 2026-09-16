package com.fitnessuplink.services;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, UUID> {
    List<ServiceCategory> findAllByOrderBySortOrderAsc();

    List<ServiceCategory> findByActiveTrueOrderBySortOrderAsc();
}

interface ProviderServiceRepository extends JpaRepository<ProviderService, UUID> {
    List<ProviderService> findByProviderIdOrderByCreatedAtDesc(UUID providerId);

    List<ProviderService> findByProviderIdAndActiveTrueOrderByCreatedAtDesc(UUID providerId);

    Optional<ProviderService> findByIdAndProviderId(UUID id, UUID providerId);

    List<ProviderService> findByCategoryIdAndActiveTrue(UUID categoryId);
}

interface ServiceQuoteRequestRepository extends JpaRepository<ServiceQuoteRequest, UUID> {
    List<ServiceQuoteRequest> findByProviderIdOrderByCreatedAtDesc(UUID providerId);

    List<ServiceQuoteRequest> findByRequesterIdOrderByCreatedAtDesc(UUID requesterId);

    Optional<ServiceQuoteRequest> findByIdAndProviderId(UUID id, UUID providerId);
}
