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
@Table(name = "marketplace_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketplaceMessage {
    @Id
    private UUID id;
    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;
    @Column(name = "sender_id", nullable = false)
    private UUID senderId;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
