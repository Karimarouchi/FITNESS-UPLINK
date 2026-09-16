package com.fitnessuplink.billing;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "billing_plan_entitlements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BillingPlanEntitlement {
    @EmbeddedId
    private Id id;
    @Column(name = "limit_value")
    private Integer limitValue;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Id implements Serializable {
        @Column(name = "plan_id")
        private UUID planId;
        @Column(name = "entitlement_code")
        private String entitlementCode;
    }
}
