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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {
    @Id
    private UUID id;
    @Column(name = "supplier_id", nullable = false)
    private UUID supplierId;
    @Column(name = "category_id", nullable = false)
    private UUID categoryId;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(length = 120)
    private String brand;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(name = "technical_sheet", columnDefinition = "TEXT")
    private String technicalSheet;
    @Column(name = "price_amount")
    private BigDecimal priceAmount;
    @Column(name = "price_currency", length = 3)
    private String priceCurrency;
    @Column(name = "photos_json", columnDefinition = "TEXT")
    private String photosJson;
    @Column(name = "videos_json", columnDefinition = "TEXT")
    private String videosJson;
    @Column(nullable = false)
    private boolean active;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
