package com.fitnessuplink.academy;

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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "formations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Formation {
    @Id
    private UUID id;
    @Column(name = "organizer_id", nullable = false)
    private UUID organizerId;
    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 20)
    private FormationContentType contentType;
    @Column(nullable = false, length = 160)
    private String title;
    @Column(name = "trainer_name", length = 160)
    private String trainerName;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(length = 40)
    private String language;
    @Column(length = 200)
    private String location;
    @Column(name = "is_online", nullable = false)
    private boolean online;
    @Column(name = "price_amount", nullable = false)
    private BigDecimal priceAmount;
    @Column(name = "price_currency", nullable = false, length = 3)
    private String priceCurrency;
    @Column(name = "has_certification", nullable = false)
    private boolean hasCertification;
    @Column(name = "image_upload_id")
    private UUID imageUploadId;
    @Column(nullable = false)
    private boolean active;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
