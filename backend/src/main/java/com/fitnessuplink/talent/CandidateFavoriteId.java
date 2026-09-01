package com.fitnessuplink.talent;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CandidateFavoriteId implements Serializable {

    private UUID employerId;
    private UUID candidateId;
}
