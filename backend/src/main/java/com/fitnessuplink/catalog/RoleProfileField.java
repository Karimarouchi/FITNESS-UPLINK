package com.fitnessuplink.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "role_profile_fields")
@Getter
@Setter
@NoArgsConstructor
public class RoleProfileField {

    @EmbeddedId
    private RoleProfileFieldId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("roleId")
    @JoinColumn(name = "role_id")
    private AppRole role;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("fieldId")
    @JoinColumn(name = "field_id")
    private ProfileField field;

    @Column(name = "required_override")
    private Boolean requiredOverride;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "visibility_required", nullable = false)
    private boolean visibilityRequired;
}
