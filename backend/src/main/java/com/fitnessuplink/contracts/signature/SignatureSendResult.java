package com.fitnessuplink.contracts.signature;

import com.fitnessuplink.contracts.ContractStatus;

public record SignatureSendResult(
        String externalId,
        ContractStatus status
) {
}
