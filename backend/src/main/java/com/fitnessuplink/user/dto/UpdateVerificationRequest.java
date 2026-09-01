package com.fitnessuplink.user.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateVerificationRequest(@NotBlank String status) {
}
