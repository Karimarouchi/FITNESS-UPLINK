package com.fitnessuplink.admin.dto;

public record VerificationPersonDto(
        String name,
        String title,
        String idNumber,
        String email,
        String phone
) {
}
