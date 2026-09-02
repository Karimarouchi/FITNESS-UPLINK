package com.fitnessuplink.contracts.signature;

import com.fitnessuplink.contracts.ContractSignerRole;

public interface ElectronicSignatureProvider {

    String name();

    SignatureSendResult sendForSignature(SignatureRequest request);

    SignaturePartyResult sign(String externalId, ContractSignerRole role);

    SignaturePartyResult getStatus(String externalId);

    byte[] downloadSignedDocument(String externalId);

    byte[] downloadAuditTrail(String externalId);

    void cancel(String externalId);
}
