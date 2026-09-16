package com.fitnessuplink.talent.dto;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class CandidateSearchQueryTest {

    @Test
    void clampsPageSizeAndBlankFilters() {
        CandidateSearchQuery query = CandidateSearchQuery.of(
                "  amira  ",
                null,
                " ",
                null,
                "yoga",
                null,
                null,
                null,
                null,
                null,
                null,
                "unknown",
                -2,
                999
        );
        assertEquals("amira", query.q());
        assertNull(query.city());
        assertEquals("yoga", query.specialty());
        assertEquals("date", query.sort());
        assertEquals(0, query.page());
        assertEquals(50, query.size());
    }
}
