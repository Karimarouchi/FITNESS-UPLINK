package com.fitnessuplink.billing;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.billing.dto.BillingDtos.AdminPlanUpdate;
import com.fitnessuplink.billing.dto.BillingDtos.AdminSubscriberDto;
import com.fitnessuplink.billing.dto.BillingDtos.EntitlementDto;
import com.fitnessuplink.billing.dto.BillingDtos.PlanDto;
import com.fitnessuplink.billing.dto.BillingDtos.PlanEntitlementUpdate;
import com.fitnessuplink.billing.dto.BillingDtos.PriceDto;
import com.fitnessuplink.billing.dto.BillingDtos.TestCardDto;
import com.fitnessuplink.billing.dto.BillingDtos.UpsertTestCardRequest;
import com.fitnessuplink.billing.dto.BillingDtos.VatDto;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminBillingService {

    private final PermissionService permissionService;
    private final BillingPlanRepository billingPlanRepository;
    private final BillingPlanPriceRepository billingPlanPriceRepository;
    private final BillingPlanEntitlementRepository billingPlanEntitlementRepository;
    private final BillingEntitlementRepository billingEntitlementRepository;
    private final BillingFamilyRepository billingFamilyRepository;
    private final BillingSubscriptionRepository billingSubscriptionRepository;
    private final BillingPaymentRepository billingPaymentRepository;
    private final BillingTestCardRepository billingTestCardRepository;
    private final BillingCountryVatRepository billingCountryVatRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PlanDto> plans(User admin) {
        permissionService.require(admin, Permissions.ADMIN_CONFIG);
        return billingPlanRepository.findAllByOrderBySortOrderAsc().stream().map(this::toPlan).toList();
    }

    @Transactional(readOnly = true)
    public List<EntitlementDto> entitlements(User admin) {
        permissionService.require(admin, Permissions.ADMIN_CONFIG);
        return billingEntitlementRepository.findAllByOrderBySortOrderAsc().stream()
                .map(row -> new EntitlementDto(row.getCode(), row.getLabel(), row.getHint(), row.getLimitKind(), null))
                .toList();
    }

    @Transactional
    public PlanDto updatePlan(User admin, UUID planId, AdminPlanUpdate request) {
        permissionService.require(admin, Permissions.ADMIN_CONFIG);
        BillingPlan plan = billingPlanRepository.findById(planId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND"));
        if (request.name() != null && !request.name().isBlank()) {
            plan.setName(request.name().trim());
        }
        if (request.tagline() != null) {
            plan.setTagline(request.tagline().trim());
        }
        if (request.featured() != null) {
            plan.setFeatured(request.featured());
        }
        if (request.active() != null) {
            plan.setActive(request.active());
        }
        if (request.trialDays() != null) {
            if (request.trialDays() < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TRIAL_DAYS");
            }
            plan.setTrialDays(request.trialDays());
        }
        billingPlanRepository.save(plan);
        if (request.prices() != null) {
            for (PriceDto price : request.prices()) {
                BillingPlanPrice row = billingPlanPriceRepository
                        .findByPlanIdAndCurrencyAndInterval(plan.getId(), price.currency(), price.interval())
                        .orElseGet(() -> BillingPlanPrice.builder()
                                .id(UUID.randomUUID())
                                .planId(plan.getId())
                                .currency(price.currency())
                                .interval(price.interval())
                                .build());
                row.setAmount(price.amount());
                billingPlanPriceRepository.save(row);
            }
        }
        if (request.entitlements() != null) {
            billingPlanEntitlementRepository.deleteByIdPlanId(plan.getId());
            for (PlanEntitlementUpdate item : request.entitlements()) {
                billingPlanEntitlementRepository.save(new BillingPlanEntitlement(
                        new BillingPlanEntitlement.Id(plan.getId(), item.code()),
                        item.limitValue()
                ));
            }
        }
        return toPlan(plan);
    }

    @Transactional(readOnly = true)
    public List<AdminSubscriberDto> subscribers(User admin) {
        permissionService.require(admin, Permissions.ADMIN_CONFIG);
        return billingSubscriptionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(sub -> {
                    User user = userRepository.findById(sub.getUserId()).orElse(null);
                    BillingPlan plan = billingPlanRepository.findById(sub.getPlanId()).orElse(null);
                    return new AdminSubscriberDto(
                            sub.getId(),
                            sub.getUserId(),
                            user == null ? "" : user.getEmail(),
                            user == null ? "" : user.getDisplayName(),
                            plan == null ? "" : plan.getName(),
                            sub.getStatus().name(),
                            sub.getCurrency(),
                            sub.getTrialEndsAt(),
                            sub.getCurrentPeriodEnd()
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BillingPayment> failures(User admin) {
        permissionService.require(admin, Permissions.ADMIN_CONFIG);
        return billingPaymentRepository.findByStatusOrderByCreatedAtDesc("FAILED");
    }

    @Transactional(readOnly = true)
    public List<TestCardDto> testCards(User admin) {
        permissionService.require(admin, Permissions.ADMIN_CONFIG);
        return billingTestCardRepository.findAllByOrderByLabelAsc().stream().map(this::toCard).toList();
    }

    @Transactional
    public TestCardDto saveCard(User admin, UpsertTestCardRequest request) {
        permissionService.require(admin, Permissions.ADMIN_CONFIG);
        String pan = request.pan() == null ? "" : request.pan().replaceAll("\\D", "");
        if (pan.length() < 13) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CARD_UNKNOWN");
        }
        BillingTestCard card = billingTestCardRepository.findByPan(pan)
                .orElseGet(() -> BillingTestCard.builder().id(UUID.randomUUID()).pan(pan).build());
        card.setPan(pan);
        card.setOutcome(request.outcome() == null ? "SUCCESS" : request.outcome().trim().toUpperCase());
        card.setLabel(request.label() == null ? "Carte test" : request.label().trim());
        card.setEnabled(request.enabled() == null || request.enabled());
        return toCard(billingTestCardRepository.save(card));
    }

    @Transactional(readOnly = true)
    public List<VatDto> vat(User admin) {
        permissionService.require(admin, Permissions.ADMIN_CONFIG);
        return billingCountryVatRepository.findAll().stream()
                .sorted(Comparator.comparing(BillingCountryVat::getIso2))
                .map(row -> new VatDto(row.getIso2(), row.getRate()))
                .toList();
    }

    @Transactional
    public VatDto saveVat(User admin, VatDto request) {
        permissionService.require(admin, Permissions.ADMIN_CONFIG);
        BillingCountryVat row = billingCountryVatRepository.findById(request.iso2().toUpperCase())
                .orElseGet(BillingCountryVat::new);
        row.setIso2(request.iso2().toUpperCase());
        row.setRate(request.rate());
        billingCountryVatRepository.save(row);
        return new VatDto(row.getIso2(), row.getRate());
    }

    private PlanDto toPlan(BillingPlan plan) {
        var family = billingFamilyRepository.findById(plan.getFamilyId()).orElse(null);
        var prices = billingPlanPriceRepository.findByPlanId(plan.getId()).stream()
                .map(row -> new PriceDto(row.getCurrency(), row.getInterval(), row.getAmount()))
                .toList();
        var ents = billingPlanEntitlementRepository.findByIdPlanId(plan.getId()).stream()
                .map(row -> {
                    var def = billingEntitlementRepository.findById(row.getId().getEntitlementCode()).orElse(null);
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

    private TestCardDto toCard(BillingTestCard card) {
        String pan = card.getPan();
        return new TestCardDto(
                card.getId(),
                pan.length() < 4 ? pan : pan.substring(pan.length() - 4),
                card.getOutcome(),
                card.getLabel(),
                card.isEnabled()
        );
    }
}
