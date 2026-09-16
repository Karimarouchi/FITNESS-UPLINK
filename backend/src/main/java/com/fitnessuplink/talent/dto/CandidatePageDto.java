package com.fitnessuplink.talent.dto;

import java.util.List;

public record CandidatePageDto(
        List<CandidateCardResponse> items,
        long total,
        int page,
        int size
) {
}
