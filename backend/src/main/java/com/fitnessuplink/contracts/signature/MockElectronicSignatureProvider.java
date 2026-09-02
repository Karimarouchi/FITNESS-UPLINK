package com.fitnessuplink.contracts.signature;

import com.fitnessuplink.contracts.ContractSignerRole;
import com.fitnessuplink.contracts.ContractStatus;
import com.fitnessuplink.contracts.DraftPdfWriter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "app.signature.provider", havingValue = "mock", matchIfMissing = true)
public class MockElectronicSignatureProvider implements ElectronicSignatureProvider {

    private final SignatureProperties properties;
    private final Map<String, StoredRequest> requests = new ConcurrentHashMap<>();

    public MockElectronicSignatureProvider(SignatureProperties properties) {
        this.properties = properties;
    }

    @Override
    public String name() {
        return "mock";
    }

    @Override
    public SignatureSendResult sendForSignature(SignatureRequest request) {
        if (properties.failSend()) {
            throw new SignatureProviderException();
        }
        String externalId = "mock-" + request.contractId();
        requests.put(externalId, new StoredRequest(request, false, false));
        return new SignatureSendResult(externalId, ContractStatus.SENT);
    }

    @Override
    public SignaturePartyResult sign(String externalId, ContractSignerRole role) {
        StoredRequest stored = require(externalId);
        SignaturePartyResult next = SignaturePartyResult.after(role, stored.candidateSigned, stored.employerSigned);
        stored.candidateSigned = next.candidateSigned();
        stored.employerSigned = next.employerSigned();
        return next;
    }

    @Override
    public SignaturePartyResult getStatus(String externalId) {
        StoredRequest stored = require(externalId);
        return SignaturePartyResult.of(stored.candidateSigned, stored.employerSigned);
    }

    @Override
    public byte[] downloadSignedDocument(String externalId) {
        StoredRequest stored = require(externalId);
        if (!stored.candidateSigned || !stored.employerSigned) {
            throw new SignatureProviderException();
        }
        return stored.request.document();
    }

    @Override
    public byte[] downloadAuditTrail(String externalId) {
        StoredRequest stored = require(externalId);
        return DraftPdfWriter.write(
                "Preuve de signature (mock)",
                List.of(
                        "Prestataire : mock — aucun prestataire juridique n’est configuré.",
                        "Demande : " + externalId,
                        "Candidat signe : " + stored.candidateSigned,
                        "Employeur signe : " + stored.employerSigned
                )
        );
    }

    @Override
    public void cancel(String externalId) {
        requests.remove(externalId);
    }

    private StoredRequest require(String externalId) {
        StoredRequest stored = requests.get(externalId);
        if (stored == null) {
            throw new SignatureProviderException();
        }
        return stored;
    }

    private static final class StoredRequest {
        private final SignatureRequest request;
        private boolean candidateSigned;
        private boolean employerSigned;

        private StoredRequest(SignatureRequest request, boolean candidateSigned, boolean employerSigned) {
            this.request = request;
            this.candidateSigned = candidateSigned;
            this.employerSigned = employerSigned;
        }
    }
}
