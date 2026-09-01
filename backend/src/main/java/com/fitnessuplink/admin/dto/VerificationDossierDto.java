package com.fitnessuplink.admin.dto;

import java.util.List;

public record VerificationDossierDto(
        VerificationAccountDto account,
        List<VerificationSectionDto> sections
) {
}
