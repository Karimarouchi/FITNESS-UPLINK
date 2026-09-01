package com.fitnessuplink.talent.dto;

import java.util.UUID;

public record FileRef(UUID id, String name, String contentType, long size) {
}
