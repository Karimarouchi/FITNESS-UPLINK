package com.fitnessuplink.services;

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
@Table(name = "service_quote_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceQuoteRequest {
    @Id
    private UUID id;
    @Column(name = "provider_id", nullable = false)
    private UUID providerId;
    @Column(name = "requester_id", nullable = false)
    private UUID requesterId;
    @Column(name = "company_name", nullable = false, length = 160)
    private String companyName;
    @Column(name = "country_id")
    private UUID countryId;
    @Column(length = 120)
    private String city;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;
    @Column(name = "attachments_json", columnDefinition = "TEXT")
    private String attachmentsJson;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ServiceQuoteStatus status;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "handled_at")
    private Instant handledAt;
}
