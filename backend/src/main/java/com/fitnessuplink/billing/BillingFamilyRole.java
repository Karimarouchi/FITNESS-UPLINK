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
@Table(name = "billing_family_roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BillingFamilyRole {
    @EmbeddedId
    private Id id;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Id implements Serializable {
        @Column(name = "family_id")
        private UUID familyId;
        @Column(name = "role_code")
        private String roleCode;
    }
}
