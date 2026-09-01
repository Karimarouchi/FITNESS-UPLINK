package com.fitnessuplink.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
public class AppRole {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(name = "category_label", nullable = false, length = 120)
    private String categoryLabel;

    @Column(nullable = false, length = 80)
    private String icon;

    @Column(nullable = false)
    private boolean selectable;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
