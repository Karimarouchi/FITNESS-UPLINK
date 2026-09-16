package com.fitnessuplink.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record BulkUserActionRequest(
        @NotEmpty @Size(max = 100) List<UUID> ids,
        @NotBlank String action
) {
}
