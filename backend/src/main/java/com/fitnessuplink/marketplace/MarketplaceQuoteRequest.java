package com.fitnessuplink.marketplace;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "marketplace_quote_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketplaceQuoteRequest {
    @Id
    private UUID id;
    @Column(name = "product_id", nullable = false)
    private UUID productId;
    @Column(name = "supplier_id", nullable = false)
    private UUID supplierId;
    @Column(nullable = false)
    private String email;
    @Column(name = "full_name", nullable = false, length = 160)
    private String fullName;
    @Column(length = 40)
    private String phone;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;
    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;
    @Column(name = "code_expires_at", nullable = false)
    private Instant codeExpiresAt;
    @Column(nullable = false)
    private int attempts;
    @Column(name = "verified_at")
    private Instant verifiedAt;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private MarketplaceQuoteStatus status;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "handled_at")
    private Instant handledAt;
}
