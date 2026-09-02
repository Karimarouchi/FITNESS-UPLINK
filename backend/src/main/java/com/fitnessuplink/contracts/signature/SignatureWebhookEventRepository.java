package com.fitnessuplink.contracts.signature;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SignatureWebhookEventRepository extends JpaRepository<SignatureWebhookEvent, UUID> {

    boolean existsByProviderAndExternalIdAndEventTypeAndPayloadHash(
            String provider,
            String externalId,
            String eventType,
            String payloadHash
    );
}
