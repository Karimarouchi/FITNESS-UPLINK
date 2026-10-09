package com.fitnessuplink.marketplace;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "marketplace_conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketplaceConversation {
    @Id
    private UUID id;
    @Column(name = "product_id")
    private UUID productId;
    @Column(name = "product_name", nullable = false, length = 160)
    private String productName;
    @Column(name = "buyer_id", nullable = false)
    private UUID buyerId;
    @Column(name = "supplier_id", nullable = false)
    private UUID supplierId;
    @Column(name = "last_message_preview", length = 280)
    private String lastMessagePreview;
    @Column(name = "last_message_at", nullable = false)
    private Instant lastMessageAt;
    @Column(name = "buyer_last_read_at")
    private Instant buyerLastReadAt;
    @Column(name = "supplier_last_read_at")
    private Instant supplierLastReadAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public boolean involves(UUID userId) {
        return buyerId.equals(userId) || supplierId.equals(userId);
    }

    public boolean isSupplier(UUID userId) {
        return supplierId.equals(userId);
    }
}
