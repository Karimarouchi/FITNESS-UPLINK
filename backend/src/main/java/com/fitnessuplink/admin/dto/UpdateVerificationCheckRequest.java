package com.fitnessuplink.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateVerificationCheckRequest(@NotBlank String status) {
}
