package com.fitnessuplink.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "billing_test_cards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingTestCard {
    @Id
    private UUID id;
    @Column(nullable = false, unique = true, length = 19)
    private String pan;
    @Column(nullable = false, length = 16)
    private String outcome;
    @Column(nullable = false, length = 80)
    private String label;
    @Column(nullable = false)
    private boolean enabled;
}
