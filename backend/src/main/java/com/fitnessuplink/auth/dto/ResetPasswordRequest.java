package com.fitnessuplink.auth.dto;

import com.fitnessuplink.auth.validation.StrongPassword;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank
        @Email
        @Size(max = 255)
        @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$", message = "Enter a valid email address")
        String email,
        @NotBlank
        @Pattern(regexp = "^\\d{6}$", message = "Enter the 6-digit code")
        String code,
        @NotBlank @StrongPassword String password,
        @NotBlank @Size(min = 8, max = 128) String confirmPassword
) {
    @AssertTrue(message = "Passwords do not match")
    public boolean isPasswordConfirmed() {
        return password != null && password.equals(confirmPassword);
    }
}
