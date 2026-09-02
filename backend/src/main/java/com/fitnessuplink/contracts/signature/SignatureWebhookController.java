package com.fitnessuplink.contracts.signature;

import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.contracts.ContractService;
import com.fitnessuplink.contracts.signature.dto.SignatureWebhookRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@RestController
@RequestMapping("/v1/webhooks/signature")
@RequiredArgsConstructor
public class SignatureWebhookController {

    private final SignatureProperties signatureProperties;
    private final SignatureWebhookEventRepository signatureWebhookEventRepository;
    private final ContractService contractService;

    @PostMapping
    public void handle(
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secret,
            @Valid @RequestBody SignatureWebhookRequest request
    ) {
        if (secret == null || !MessageDigest.isEqual(
                secret.getBytes(StandardCharsets.UTF_8),
                signatureProperties.webhookSecret().getBytes(StandardCharsets.UTF_8)
        )) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        String payloadHash = sha256(request.provider() + "|" + request.externalId() + "|" + request.event());
        if (signatureWebhookEventRepository.existsByProviderAndExternalIdAndEventTypeAndPayloadHash(
                request.provider(),
                request.externalId(),
                request.event(),
                payloadHash
        )) {
            return;
        }
        contractService.applyWebhook(request.provider(), request.externalId(), request.event());
        signatureWebhookEventRepository.save(SignatureWebhookEvent.builder()
                .id(UUID.randomUUID())
                .provider(request.provider())
                .externalId(request.externalId())
                .eventType(request.event())
                .payloadHash(payloadHash)
                .createdAt(Instant.now())
                .build());
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SIGNATURE_PROVIDER_ERROR");
        }
    }
}
