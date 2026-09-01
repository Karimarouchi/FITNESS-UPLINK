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
@Table(name = "profile_fields")
@Getter
@Setter
@NoArgsConstructor
public class ProfileField {

    @Id
    private UUID id;

    @Column(name = "field_key", nullable = false, unique = true, length = 64)
    private String fieldKey;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(name = "field_type", nullable = false, length = 32)
    private String fieldType;

    @Column(length = 160)
    private String placeholder;

    @Column(name = "options_json", columnDefinition = "TEXT")
    private String optionsJson;

    @Column(nullable = false)
    private boolean required;

    @Column(name = "max_length")
    private Integer maxLength;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "section_key", nullable = false, length = 64)
    private String sectionKey;

    @Column(name = "section_label", nullable = false, length = 120)
    private String sectionLabel;

    @Column(name = "section_icon", nullable = false, length = 80)
    private String sectionIcon;

    @Column(name = "help_text", length = 240)
    private String helpText;

    @Column(length = 160)
    private String accept;
}
