package com.fitnessuplink.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "billing_country_vat")
@Getter
@Setter
@NoArgsConstructor
public class BillingCountryVat {
    @Id
    @Column(length = 2)
    private String iso2;
    @Column(nullable = false)
    private BigDecimal rate;
}
