package com.fitnessuplink.contracts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contract {

    @Id
    private UUID id;

    @Column(name = "recruitment_id", nullable = false)
    private UUID recruitmentId;

    @Column(name = "employer_id", nullable = false)
    private UUID employerId;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "job_offer_id")
    private UUID jobOfferId;

    @Column(nullable = false, length = 180)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ContractStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ContractSource source;

    @Column(name = "terms_json", columnDefinition = "TEXT")
    private String termsJson;

    @Column(name = "original_upload_id")
    private UUID originalUploadId;

    @Column(name = "signed_upload_id")
    private UUID signedUploadId;

    /** PDF signed by hand and uploaded by the candidate. */
    @Column(name = "candidate_upload_id")
    private UUID candidateUploadId;

    @Column(name = "audit_trail_upload_id")
    private UUID auditTrailUploadId;

    @Column(name = "signature_provider", nullable = false, length = 64)
    private String signatureProvider;

    @Column(name = "external_signature_request_id", length = 120)
    private String externalSignatureRequestId;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "candidate_signed_at")
    private Instant candidateSignedAt;

    @Column(name = "employer_signed_at")
    private Instant employerSignedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    public boolean isLocked() {
        return status == ContractStatus.COMPLETED;
    }
}
