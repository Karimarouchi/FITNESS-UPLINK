package com.fitnessuplink.services.dto;

import com.fitnessuplink.talent.dto.FileRef;
import com.fitnessuplink.user.dto.CountrySummary;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ServicesDtos {
    private ServicesDtos() {
    }

    public record ServiceCategoryDto(UUID id, String name, int sortOrder, boolean active) {
    }

    public record UpsertCategoryRequest(String name, Integer sortOrder, Boolean active) {
    }

    public record ProviderServiceDto(
            UUID id,
            UUID categoryId,
            String categoryName,
            String name,
            String description,
            boolean active
    ) {
    }

    public record UpsertProviderServiceRequest(UUID categoryId, String name, String description, Boolean active) {
    }

    public record ProviderCardDto(
            UUID id,
            String displayName,
            UUID logoUploadId,
            String description,
            String city,
            CountrySummary country,
            List<String> categoryNames,
            boolean subscribed
    ) {
    }

    public record ProviderPageDto(List<ProviderCardDto> items, long total, int page, int size) {
    }

    public record ProviderProfileDto(
            UUID id,
            String displayName,
            UUID logoUploadId,
            String description,
            String website,
            String phone,
            String email,
            String city,
            CountrySummary country,
            List<CountrySummary> coverageCountries,
            List<UUID> photoUploadIds,
            List<String> portfolioVideos,
            List<ProviderServiceDto> services,
            boolean subscribed
    ) {
    }

    public record CreateQuoteRequest(
            String companyName,
            UUID countryId,
            String city,
            String message,
            List<UUID> attachmentUploadIds
    ) {
    }

    public record QuoteRequestDto(
            UUID id,
            UUID providerId,
            String providerDisplayName,
            UUID requesterId,
            String requesterDisplayName,
            String companyName,
            CountrySummary country,
            String city,
            String message,
            List<FileRef> attachments,
            String status,
            Instant createdAt,
            Instant handledAt
    ) {
    }
}
