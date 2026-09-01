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
@Table(name = "countries")
@Getter
@Setter
@NoArgsConstructor
public class Country {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 2)
    private String iso2;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "flag_emoji", nullable = false, length = 16)
    private String flagEmoji;

    @Column(name = "calling_code", nullable = false, length = 8)
    private String callingCode;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
