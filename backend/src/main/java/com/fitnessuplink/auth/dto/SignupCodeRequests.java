package com.fitnessuplink.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class SignupCodeRequests {

    private SignupCodeRequests() {
    }

    public record VerifySignupRequest(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Enter the 6-digit code") String code
    ) {
    }

    public record ResendSignupRequest(
            @NotBlank @Email @Size(max = 255) String email
    ) {
    }

    public record PendingSignupResponse(
            String email,
            long codeExpiresInSeconds,
            long resendInSeconds
    ) {
    }
}
