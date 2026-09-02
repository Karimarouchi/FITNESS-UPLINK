package com.fitnessuplink.contracts.signature;

import java.util.List;
import java.util.UUID;

public record SignatureParty(
        UUID userId,
        String role,
        String name,
        String email
) {
}
