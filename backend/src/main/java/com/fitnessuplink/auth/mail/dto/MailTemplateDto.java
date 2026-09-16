package com.fitnessuplink.auth.mail.dto;

import com.fitnessuplink.auth.mail.MailPurpose;

public record MailTemplateDto(
        MailPurpose purpose,
        String subject,
        String body
) {
}
