package com.fitnessuplink.onboarding.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SelectRoleRequest(@NotNull UUID roleId) {
}
