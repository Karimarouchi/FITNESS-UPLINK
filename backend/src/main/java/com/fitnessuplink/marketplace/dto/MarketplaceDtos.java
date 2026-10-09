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
            Boolean active,
            String condition
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
            boolean active,
            String condition,
            int viewCount,
            boolean hiddenByAdmin,
            String hiddenReason,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record SupplierStatsDto(
            long products,
            long published,
            long drafts,
            long hidden,
            long views,
            long conversations,
            long unreadConversations
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
            SupplierSummaryDto supplier,
            String condition
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

    // ---------- messaging ----------

    public record SendMarketplaceMessageRequest(String body) {
    }

    public record CounterpartDto(UUID id, String displayName, String subtitle) {
    }

    public record ConversationDto(
            UUID id,
            UUID productId,
            String productName,
            UUID productPhotoUploadId,
            BigDecimal productPriceAmount,
            String productPriceCurrency,
            boolean productAvailable,
            String viewerRole,
            CounterpartDto counterpart,
            String lastMessagePreview,
            Instant lastMessageAt,
            long unreadCount
    ) {
    }

    public record MarketplaceMessageDto(UUID id, UUID senderId, String senderName, boolean mine, String body, Instant createdAt) {
    }

    public record ConversationThreadDto(ConversationDto conversation, List<MarketplaceMessageDto> messages) {
    }

    public record ConversationRefDto(UUID conversationId) {
    }

    public record UnreadCountDto(long count) {
    }

    // ---------- admin ----------

    public record AdminMarketplaceStatsDto(
            long products,
            long visible,
            long hidden,
            long inactive,
            long suppliers,
            long activeSuppliers,
            long conversations,
            long newConversations7d
    ) {
    }

    public record AdminProductRowDto(
            UUID id,
            String name,
            String brand,
            UUID categoryId,
            String categoryName,
            BigDecimal priceAmount,
            String priceCurrency,
            String condition,
            UUID firstPhotoUploadId,
            UUID supplierId,
            String supplierName,
            String supplierEmail,
            boolean active,
            boolean hiddenByAdmin,
            String hiddenReason,
            Instant hiddenAt,
            int viewCount,
            long conversationCount,
            Instant createdAt
    ) {
    }

    public record AdminProductPageDto(List<AdminProductRowDto> items, long total, int page, int size) {
    }

    public record HideProductRequest(String reason) {
    }

    public record AdminSupplierRowDto(
            UUID id,
            String displayName,
            String email,
            String city,
            boolean enabled,
            long productCount,
            long visibleCount,
            long hiddenCount,
            long conversationCount,
            Instant createdAt
    ) {
    }
}
