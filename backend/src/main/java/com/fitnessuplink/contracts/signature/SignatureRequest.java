package com.fitnessuplink.contracts.signature;

import java.util.List;
import java.util.UUID;

public record SignatureRequest(
        UUID contractId,
        String title,
        byte[] document,
        String fileName,
        List<SignatureParty> parties
) {
}
