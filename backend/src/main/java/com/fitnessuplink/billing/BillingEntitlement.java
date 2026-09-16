package com.fitnessuplink.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "billing_entitlements")
@Getter
@Setter
@NoArgsConstructor
public class BillingEntitlement {
    @Id
    private String code;
    @Column(nullable = false)
    private String label;
    private String hint;
    @Column(name = "limit_kind", nullable = false)
    private String limitKind;
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
