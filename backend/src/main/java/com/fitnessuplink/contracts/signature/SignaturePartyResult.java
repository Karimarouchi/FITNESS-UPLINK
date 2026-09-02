package com.fitnessuplink.contracts.signature;

import com.fitnessuplink.contracts.ContractSignerRole;
import com.fitnessuplink.contracts.ContractStatus;

public record SignaturePartyResult(
        ContractStatus status,
        boolean candidateSigned,
        boolean employerSigned,
        boolean completed
) {
    public static SignaturePartyResult of(boolean candidateSigned, boolean employerSigned) {
        if (candidateSigned && employerSigned) {
            return new SignaturePartyResult(ContractStatus.COMPLETED, true, true, true);
        }
        if (employerSigned) {
            return new SignaturePartyResult(ContractStatus.EMPLOYER_SIGNED, candidateSigned, true, false);
        }
        if (candidateSigned) {
            return new SignaturePartyResult(ContractStatus.CANDIDATE_SIGNED, true, false, false);
        }
        return new SignaturePartyResult(ContractStatus.SENT, false, false, false);
    }

    public static SignaturePartyResult after(ContractSignerRole role, boolean candidateSigned, boolean employerSigned) {
        boolean nextCandidate = candidateSigned || role == ContractSignerRole.CANDIDATE;
        boolean nextEmployer = employerSigned || role == ContractSignerRole.EMPLOYER;
        return of(nextCandidate, nextEmployer);
    }
}
