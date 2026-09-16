package com.fitnessuplink.billing;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class TestCardPaymentProvider implements PaymentProvider {

    private final BillingTestCardRepository billingTestCardRepository;

    public TestCardPaymentProvider(BillingTestCardRepository billingTestCardRepository) {
        this.billingTestCardRepository = billingTestCardRepository;
    }

    @Override
    public ChargeResult charge(String pan, BigDecimal amount, String currency) {
        String digits = pan == null ? "" : pan.replaceAll("\\D", "");
        if (digits.length() != 16) {
            return new ChargeResult(false, "TEST_CARD", null, "CARD_INVALID");
        }
        BillingTestCard card = billingTestCardRepository.findByPanAndEnabledTrue(digits).orElse(null);
        String ref = "test_" + UUID.randomUUID();
        if (card == null) {
            // Test phase: any well-formed card not explicitly configured to decline is auto-approved.
            return new ChargeResult(true, "TEST_CARD", ref, "PAID");
        }
        if ("SUCCESS".equals(card.getOutcome())) {
            return new ChargeResult(true, "TEST_CARD", ref, "PAID");
        }
        return new ChargeResult(false, "TEST_CARD", ref, "CARD_DECLINED");
    }

    public BillingTestCard requireCard(String pan) {
        String digits = pan == null ? "" : pan.replaceAll("\\D", "");
        if (digits.length() != 16) {
            return null;
        }
        return billingTestCardRepository.findByPanAndEnabledTrue(digits)
                .orElseGet(() -> billingTestCardRepository.save(BillingTestCard.builder()
                        .id(UUID.randomUUID())
                        .pan(digits)
                        .outcome("SUCCESS")
                        .label("Carte test (auto)")
                        .enabled(true)
                        .build()));
    }

    public BillingTestCard requireCardFromId(UUID id) {
        return billingTestCardRepository.findById(id).filter(BillingTestCard::isEnabled).orElse(null);
    }
}
