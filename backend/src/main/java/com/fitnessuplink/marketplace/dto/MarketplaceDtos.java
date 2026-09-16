package com.fitnessuplink.marketplace.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class MarketplaceDtos {
    private MarketplaceDtos() {
    }

    public record ProductCategoryDto(UUID id, String name, int sortOrder, boolean active) {
    }

    public record UpsertCategoryRequest(String name, Integer sortOrder, Boolean active) {
    }

    public record UpsertProductRequest(
            UUID categoryId,
            String name,
            String brand,
            String description,
            String technicalSheet,
            BigDecimal priceAmount,
            String priceCurrency,
            List<UUID> photoUploadIds,
            List<String> videos,
            Boolean active
    ) {
    }

    public record ProductDto(
            UUID id,
            UUID categoryId,
            String categoryName,
            String name,
            String brand,
            String description,
            String technicalSheet,
            BigDecimal priceAmount,
            String priceCurrency,
            List<UUID> photoUploadIds,
            List<String> videos,
            boolean active
    ) {
    }

    public record SupplierSummaryDto(UUID id, String displayName, UUID logoUploadId, String city) {
    }

    public record ProductCardDto(
            UUID id,
            String name,
            String brand,
            String categoryName,
            BigDecimal priceAmount,
            String priceCurrency,
            UUID firstPhotoUploadId,
            SupplierSummaryDto supplier
    ) {
    }

    public record ProductPageDto(List<ProductCardDto> items, long total, int page, int size) {
    }

    public record ProductDetailDto(ProductDto product, SupplierSummaryDto supplier) {
    }

    public record CreateQuoteRequest(String fullName, String email, String phone, String message) {
    }

    public record ConfirmQuoteRequest(String code) {
    }

    public record QuoteRequestStatusDto(UUID id, String status) {
    }

    public record ReceivedQuoteRequestDto(
            UUID id,
            UUID productId,
            String productName,
            String email,
            String fullName,
            String phone,
            String message,
            String status,
            Instant createdAt,
            Instant handledAt
    ) {
    }
}
