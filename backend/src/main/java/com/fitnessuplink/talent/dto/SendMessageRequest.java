package com.fitnessuplink.talent.dto;

import java.util.UUID;

public record SendMessageRequest(String body, UUID uploadId) {
}
