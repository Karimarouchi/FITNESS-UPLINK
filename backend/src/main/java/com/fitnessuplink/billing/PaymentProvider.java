package com.fitnessuplink.billing;

import java.math.BigDecimal;

public interface PaymentProvider {
    ChargeResult charge(String pan, BigDecimal amount, String currency);
}
