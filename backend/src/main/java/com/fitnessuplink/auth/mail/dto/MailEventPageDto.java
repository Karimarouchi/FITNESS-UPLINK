package com.fitnessuplink.auth.mail.dto;

import java.util.List;

public record MailEventPageDto(
        List<MailEventDto> items,
        long total,
        int page,
        int size
) {
}
