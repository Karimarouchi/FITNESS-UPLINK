package com.fitnessuplink.talent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "negotiation_offers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NegotiationOffer {

    @Id
    private UUID id;

    @Column(name = "recruitment_id", nullable = false)
    private UUID recruitmentId;

    @Column(name = "proposer_id", nullable = false)
    private UUID proposerId;

    @Column(name = "salary_amount", nullable = false)
    private BigDecimal salaryAmount;

    @Column(name = "salary_currency", nullable = false, length = 3)
    private String salaryCurrency;

    @Column(name = "contract_type", nullable = false, length = 20)
    private String contractType;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(length = 160)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String note;

    /** PROPOSED, ACCEPTED, DECLINED or SUPERSEDED (replaced by a newer proposal). */
    @Column(nullable = false, length = 12)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "responded_at")
    private Instant respondedAt;
}
