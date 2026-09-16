package com.fitnessuplink.billing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class BillingDtos {
    private BillingDtos() {
    }

    public record EntitlementDto(String code, String label, String hint, String limitKind, Integer limitValue) {
    }

    public record PriceDto(String currency, String interval, BigDecimal amount) {
    }

    public record PlanDto(
            UUID id,
            String family,
            String familyLabel,
            String code,
            String name,
            String tagline,
            boolean featured,
            int trialDays,
            List<PriceDto> prices,
            List<EntitlementDto> entitlements
    ) {
    }

    public record CatalogDto(String family, String familyLabel, List<PlanDto> plans, List<String> currencies) {
    }

    public record CheckoutRequest(
            UUID planId,
            String interval,
            String currency,
            String cardNumber,
            String holder,
            String month,
            String year,
            String cvv,
            Boolean acceptCgv
    ) {
    }

    public record SubscriptionDto(
            UUID id,
            UUID planId,
            String planName,
            String family,
            String status,
            String interval,
            String currency,
            String cardLast4,
            Instant trialEndsAt,
            Instant currentPeriodEnd,
            Instant cancelledAt
    ) {
    }

    public record MeBillingDto(
            SubscriptionDto subscription,
            List<String> entitlements,
            Map<String, Integer> limits
    ) {
    }

    public record InvoiceDto(UUID id, String number, Instant createdAt) {
    }

    public record AdminPlanUpdate(
            String name,
            String tagline,
            Boolean featured,
            Boolean active,
            Integer trialDays,
            List<PriceDto> prices,
            List<PlanEntitlementUpdate> entitlements
    ) {
    }

    public record PlanEntitlementUpdate(String code, Integer limitValue) {
    }

    public record AdminSubscriberDto(
            UUID id,
            UUID userId,
            String email,
            String displayName,
            String planName,
            String status,
            String currency,
            Instant trialEndsAt,
            Instant currentPeriodEnd
    ) {
    }

    public record TestCardDto(UUID id, String last4, String outcome, String label, boolean enabled) {
    }

    public record UpsertTestCardRequest(String pan, String outcome, String label, Boolean enabled) {
    }

    public record VatDto(String iso2, BigDecimal rate) {
    }
}
