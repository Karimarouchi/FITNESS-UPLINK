package com.fitnessuplink.auth.dto;

import com.fitnessuplink.user.dto.UserResponse;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserResponse user
) {
}
