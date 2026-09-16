package com.fitnessuplink.billing;

import com.fitnessuplink.billing.dto.BillingDtos.CatalogDto;
import com.fitnessuplink.billing.dto.BillingDtos.CheckoutRequest;
import com.fitnessuplink.billing.dto.BillingDtos.EntitlementDto;
import com.fitnessuplink.billing.dto.BillingDtos.InvoiceDto;
import com.fitnessuplink.billing.dto.BillingDtos.MeBillingDto;
import com.fitnessuplink.billing.dto.BillingDtos.PlanDto;
import com.fitnessuplink.billing.dto.BillingDtos.PriceDto;
import com.fitnessuplink.billing.dto.BillingDtos.SubscriptionDto;
import com.fitnessuplink.audit.AuditAction;
import com.fitnessuplink.audit.AuditLogService;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingService {

    private static final List<String> CURRENCIES = List.of("TND", "EUR", "USD");

    private final BillingFamilyRepository billingFamilyRepository;
    private final BillingFamilyRoleRepository billingFamilyRoleRepository;
    private final BillingPlanRepository billingPlanRepository;
    private final BillingPlanPriceRepository billingPlanPriceRepository;
    private final BillingPlanEntitlementRepository billingPlanEntitlementRepository;
    private final BillingEntitlementRepository billingEntitlementRepository;
    private final BillingCountryVatRepository billingCountryVatRepository;
    private final BillingSubscriptionRepository billingSubscriptionRepository;
    private final BillingPaymentRepository billingPaymentRepository;
    private final BillingInvoiceRepository billingInvoiceRepository;
    private final BillingTransactionLogRepository billingTransactionLogRepository;
    private final BillingWebhookEventRepository billingWebhookEventRepository;
    private final TestCardPaymentProvider paymentProvider;
    private final EntitlementService entitlementService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public CatalogDto catalog(User user) {
        BillingFamily family = familyOf(user);
        List<PlanDto> plans = billingPlanRepository.findByFamilyIdAndActiveTrueOrderBySortOrderAsc(family.getId())
                .stream()
                .map(this::toPlan)
                .toList();
        return new CatalogDto(family.getCode(), family.getLabel(), plans, CURRENCIES);
    }

    @Transactional(readOnly = true)
    public CatalogDto publicCatalog(String familyCode) {
        String code = familyCode == null || familyCode.isBlank() ? "BUSINESS" : familyCode.trim().toUpperCase(Locale.ROOT);
        BillingFamily family = billingFamilyRepository.findAll().stream()
                .filter(row -> row.getCode().equals(code))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BILLING_FAMILY_NOT_FOUND"));
        List<PlanDto> plans = billingPlanRepository.findByFamilyIdAndActiveTrueOrderBySortOrderAsc(family.getId())
                .stream()
                .map(this::toPlan)
                .toList();
        return new CatalogDto(family.getCode(), family.getLabel(), plans, CURRENCIES);
    }

    @Transactional
    public MeBillingDto checkout(User user, CheckoutRequest request) {
        if (request == null || !Boolean.TRUE.equals(request.acceptCgv())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CGV_REQUIRED");
        }
        BillingPlan plan = billingPlanRepository.findById(request.planId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND"));
        if (!plan.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PLAN_INACTIVE");
        }
        BillingFamily family = familyOf(user);
        if (!family.getId().equals(plan.getFamilyId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PLAN_WRONG_FAMILY");
        }
        String interval = normalize(request.interval(), "MONTHLY", "YEARLY");
        String currency = normalize(request.currency(), "TND", "EUR", "USD");
        BillingPlanPrice price = billingPlanPriceRepository
                .findByPlanIdAndCurrencyAndInterval(plan.getId(), currency, interval)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "PRICE_NOT_FOUND"));
        BillingTestCard card = paymentProvider.requireCard(request.cardNumber());
        if (card == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CARD_INVALID");
        }
        if (request.cvv() == null || !request.cvv().matches("\\d{3,4}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CVV_INVALID");
        }
        ChargeResult probe = paymentProvider.charge(request.cardNumber(), price.getAmount(), currency);
        log(user.getId(), null, "CHECKOUT", probe.message() + " " + mask(request.cardNumber()));
        if (!probe.success()) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "CARD_DECLINED");
        }
        recordWebhook(probe);
        Instant now = Instant.now();
        int trialDays = Math.max(0, plan.getTrialDays());
        BillingSubscription sub = BillingSubscription.builder()
                .id(UUID.randomUUID())
                .userId(user.getId())
                .planId(plan.getId())
                .status(SubscriptionStatus.TRIAL)
                .interval(interval)
                .currency(currency)
                .testCardId(card.getId())
                .cardLast4(last4(request.cardNumber()))
                .createdAt(now)
                .updatedAt(now)
                .build();
        if (trialDays > 0) {
            Instant trialEnd = now.plus(trialDays, ChronoUnit.DAYS);
            sub.setTrialEndsAt(trialEnd);
            sub.setCurrentPeriodEnd(trialEnd);
            billingSubscriptionRepository.save(sub);
            auditLogService.record(user.getId(), user.getId(), AuditAction.SUBSCRIPTION_TRIAL_STARTED, "SUBSCRIPTION", sub.getId(), plan.getName());
            notificationService.notify(
                    user.getId(),
                    NotifyCategory.CONTRACT,
                    "Essai " + trialDays + " jours",
                    "Votre offre " + plan.getName() + " est active pendant " + trialDays + " jours.",
                    "Ouvrir",
                    "/app/billing"
            );
        } else {
            billingSubscriptionRepository.save(sub);
            activate(user, sub, plan, price, probe, now);
            auditLogService.record(user.getId(), user.getId(), AuditAction.SUBSCRIPTION_ACTIVATED, "SUBSCRIPTION", sub.getId(), plan.getName());
            notificationService.notify(
                    user.getId(),
                    NotifyCategory.CONTRACT,
                    "Abonnement activé",
                    "Votre offre " + plan.getName() + " est active.",
                    "Ouvrir",
                    "/app/billing"
            );
        }
        user.setSelectedPlan(plan.getCode());
        user.setSelectedPlanInterval(interval);
        user.setPendingPlan(null);
        user.setPendingPlanInterval(null);
        user.setOnboardingCompleted(true);
        userRepository.save(user);
        return me(user);
    }

    @Transactional(readOnly = true)
    public MeBillingDto me(User user) {
        BillingSubscription sub = entitlementService.current(user.getId());
        return new MeBillingDto(
                sub == null ? null : toSub(sub),
                entitlementService.codes(user).stream().sorted().toList(),
                entitlementService.limits(user)
        );
    }

    @Transactional
    public MeBillingDto cancel(User user) {
        BillingSubscription sub = entitlementService.current(user.getId());
        if (sub == null || !entitlementService.live(sub)) {
            throw new ApiException(HttpStatus.CONFLICT, "NO_ACTIVE_SUBSCRIPTION");
        }
        Instant now = Instant.now();
        sub.setStatus(SubscriptionStatus.CANCELLED);
        sub.setCancelledAt(now);
        sub.setUpdatedAt(now);
        billingSubscriptionRepository.save(sub);
        log(user.getId(), sub.getId(), "CANCEL", "cancelled");
        auditLogService.record(user.getId(), user.getId(), AuditAction.SUBSCRIPTION_CANCELLED, "SUBSCRIPTION", sub.getId(), null);
        return me(user);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDto> invoices(User user) {
        return billingInvoiceRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(row -> new InvoiceDto(row.getId(), row.getNumber(), row.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public BillingInvoice invoice(User user, UUID id) {
        return billingInvoiceRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));
    }

    @Transactional
    public void convertDueTrials() {
        Instant now = Instant.now();
        for (BillingSubscription sub : billingSubscriptionRepository.findByStatusAndTrialEndsAtBefore(SubscriptionStatus.TRIAL, now)) {
            chargeOrSuspend(sub, now);
        }
        for (BillingSubscription sub : billingSubscriptionRepository.findByStatusAndCurrentPeriodEndBefore(SubscriptionStatus.ACTIVE, now)) {
            chargeOrSuspend(sub, now);
        }
        for (BillingSubscription sub : billingSubscriptionRepository.findByStatusAndCurrentPeriodEndBefore(SubscriptionStatus.CANCELLED, now)) {
            sub.setStatus(SubscriptionStatus.EXPIRED);
            sub.setUpdatedAt(now);
            billingSubscriptionRepository.save(sub);
            auditLogService.record(null, sub.getUserId(), AuditAction.SUBSCRIPTION_EXPIRED, "SUBSCRIPTION", sub.getId(), null);
        }
    }

    private void chargeOrSuspend(BillingSubscription sub, Instant now) {
        User user = userRepository.findById(sub.getUserId()).orElse(null);
        BillingPlan plan = billingPlanRepository.findById(sub.getPlanId()).orElse(null);
        BillingPlanPrice price = billingPlanPriceRepository
                .findByPlanIdAndCurrencyAndInterval(sub.getPlanId(), sub.getCurrency(), sub.getInterval())
                .orElse(null);
        BillingTestCard card = sub.getTestCardId() == null ? null : paymentProvider.requireCardFromId(sub.getTestCardId());
        if (user == null || plan == null || price == null || card == null) {
            suspend(sub, now, "MISSING_CARD");
            return;
        }
        ChargeResult result = paymentProvider.charge(card.getPan(), price.getAmount(), sub.getCurrency());
        recordWebhook(result);
        log(user.getId(), sub.getId(), "RENEW", result.message());
        if (!result.success()) {
            suspend(sub, now, result.message());
            notificationService.notify(
                    user.getId(),
                    NotifyCategory.CONTRACT,
                    "Paiement refusé",
                    "Votre abonnement est suspendu. Les fonctions premium sont fermées.",
                    "Ouvrir",
                    "/app/billing"
            );
            return;
        }
        activate(user, sub, plan, price, result, now);
        auditLogService.record(null, sub.getUserId(), AuditAction.SUBSCRIPTION_RENEWED, "SUBSCRIPTION", sub.getId(), plan.getName());
    }

    private void activate(User user, BillingSubscription sub, BillingPlan plan, BillingPlanPrice price, ChargeResult result, Instant now) {
        BigDecimal vatRate = vatOf(user);
        BigDecimal vat = price.getAmount().multiply(vatRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BillingPayment payment = billingPaymentRepository.save(BillingPayment.builder()
                .id(UUID.randomUUID())
                .subscriptionId(sub.getId())
                .amount(price.getAmount())
                .currency(sub.getCurrency())
                .vatRate(vatRate)
                .vatAmount(vat)
                .status("PAID")
                .provider(result.provider())
                .providerRef(result.reference())
                .createdAt(now)
                .build());
        String number = "FU-" + String.format("%06d", billingInvoiceRepository.countAll() + 1);
        billingInvoiceRepository.save(BillingInvoice.builder()
                .id(UUID.randomUUID())
                .userId(user.getId())
                .subscriptionId(sub.getId())
                .paymentId(payment.getId())
                .number(number)
                .html(invoiceHtml(user, plan, price, vatRate, vat, number, now))
                .createdAt(now)
                .build());
        Instant periodEnd = now.plus("YEARLY".equals(sub.getInterval()) ? 365 : 30, ChronoUnit.DAYS);
        sub.setStatus(SubscriptionStatus.ACTIVE);
        sub.setCurrentPeriodEnd(periodEnd);
        sub.setUpdatedAt(now);
        billingSubscriptionRepository.save(sub);
    }

    private void suspend(BillingSubscription sub, Instant now, String reason) {
        sub.setStatus(SubscriptionStatus.SUSPENDED);
        sub.setUpdatedAt(now);
        billingSubscriptionRepository.save(sub);
        log(sub.getUserId(), sub.getId(), "SUSPEND", reason);
        auditLogService.record(null, sub.getUserId(), AuditAction.SUBSCRIPTION_SUSPENDED, "SUBSCRIPTION", sub.getId(), reason);
    }

    private BillingFamily familyOf(User user) {
        String role = user.getAppRole() == null ? "" : user.getAppRole().getCode();
        return billingFamilyRoleRepository.findFirstByIdRoleCode(role)
                .flatMap(link -> billingFamilyRepository.findById(link.getId().getFamilyId()))
                .orElseGet(() -> billingFamilyRepository.findAll().stream()
                        .filter(row -> "BUSINESS".equals(row.getCode()))
                        .findFirst()
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BILLING_FAMILY_NOT_FOUND")));
    }

    private PlanDto toPlan(BillingPlan plan) {
        BillingFamily family = billingFamilyRepository.findById(plan.getFamilyId()).orElse(null);
        List<PriceDto> prices = billingPlanPriceRepository.findByPlanId(plan.getId()).stream()
                .sorted(Comparator.comparing(BillingPlanPrice::getCurrency).thenComparing(BillingPlanPrice::getInterval))
                .map(row -> new PriceDto(row.getCurrency(), row.getInterval(), row.getAmount()))
                .toList();
        List<EntitlementDto> ents = billingPlanEntitlementRepository.findByIdPlanId(plan.getId()).stream()
                .map(row -> {
                    BillingEntitlement def = billingEntitlementRepository.findById(row.getId().getEntitlementCode()).orElse(null);
                    return new EntitlementDto(
                            row.getId().getEntitlementCode(),
                            def == null ? row.getId().getEntitlementCode() : def.getLabel(),
                            def == null ? null : def.getHint(),
                            def == null ? "NONE" : def.getLimitKind(),
                            row.getLimitValue()
                    );
                })
                .toList();
        return new PlanDto(
                plan.getId(),
                family == null ? "" : family.getCode(),
                family == null ? "" : family.getLabel(),
                plan.getCode(),
                plan.getName(),
                plan.getTagline(),
                plan.isFeatured(),
                plan.getTrialDays(),
                prices,
                ents
        );
    }

    private SubscriptionDto toSub(BillingSubscription sub) {
        BillingPlan plan = billingPlanRepository.findById(sub.getPlanId()).orElse(null);
        BillingFamily family = plan == null ? null : billingFamilyRepository.findById(plan.getFamilyId()).orElse(null);
        return new SubscriptionDto(
                sub.getId(),
                sub.getPlanId(),
                plan == null ? "" : plan.getName(),
                family == null ? "" : family.getCode(),
                sub.getStatus().name(),
                sub.getInterval(),
                sub.getCurrency(),
                sub.getCardLast4(),
                sub.getTrialEndsAt(),
                sub.getCurrentPeriodEnd(),
                sub.getCancelledAt()
        );
    }

    private BigDecimal vatOf(User user) {
        String iso = user.getCountry() == null ? "" : user.getCountry().getIso2();
        return billingCountryVatRepository.findById(iso).map(BillingCountryVat::getRate).orElse(BigDecimal.ZERO);
    }

    private void recordWebhook(ChargeResult result) {
        if (result.reference() == null) {
            return;
        }
        if (billingWebhookEventRepository.existsByProviderAndExternalId(result.provider(), result.reference())) {
            return;
        }
        billingWebhookEventRepository.save(BillingWebhookEvent.builder()
                .id(UUID.randomUUID())
                .provider(result.provider())
                .externalId(result.reference())
                .payload(result.message())
                .createdAt(Instant.now())
                .build());
    }

    private void log(UUID userId, UUID subId, String kind, String payload) {
        billingTransactionLogRepository.save(BillingTransactionLog.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .subscriptionId(subId)
                .kind(kind)
                .payload(payload)
                .createdAt(Instant.now())
                .build());
    }

    private String invoiceHtml(User user, BillingPlan plan, BillingPlanPrice price, BigDecimal vatRate, BigDecimal vat, String number, Instant at) {
        String name = plan == null ? "Offre" : plan.getName();
        return """
                <html><body style="font-family:Segoe UI,Arial,sans-serif;color:#141a32">
                <h1>Facture %s</h1>
                <p>Fitness Uplink</p>
                <p>%s<br>%s</p>
                <p>Offre : %s<br>Montant HT : %s %s<br>TVA %s %% : %s %s<br><strong>Total : %s %s</strong></p>
                <p>%s</p>
                </body></html>
                """.formatted(
                escapeHtml(number),
                escapeHtml(user.getDisplayName()),
                escapeHtml(user.getEmail()),
                escapeHtml(name),
                price.getAmount(), price.getCurrency(),
                vatRate, vat, price.getCurrency(),
                price.getAmount().add(vat), price.getCurrency(),
                at.toString()
        );
    }

    static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private static String normalize(String raw, String... allowed) {
        String value = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        for (String item : allowed) {
            if (item.equals(value)) {
                return value;
            }
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_BILLING_VALUE");
    }

    private static String last4(String pan) {
        String digits = pan == null ? "" : pan.replaceAll("\\D", "");
        return digits.length() < 4 ? digits : digits.substring(digits.length() - 4);
    }

    private static String mask(String pan) {
        String digits = pan == null ? "" : pan.replaceAll("\\D", "");
        if (digits.length() < 4) {
            return "****";
        }
        return "•••• " + digits.substring(digits.length() - 4);
    }
}
