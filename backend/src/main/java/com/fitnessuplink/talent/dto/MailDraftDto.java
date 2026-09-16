package com.fitnessuplink.talent.dto;

public record MailDraftDto(
        String to,
        String subject,
        String body,
        boolean sentByApp
) {
}
