package com.fitnessuplink.billing;

import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EntitlementService {

    private final BillingSubscriptionRepository billingSubscriptionRepository;
    private final BillingPlanEntitlementRepository billingPlanEntitlementRepository;
    private final BillingGrantRepository billingGrantRepository;
    private final BillingEntitlementRepository billingEntitlementRepository;

    @Transactional(readOnly = true)
    public boolean has(User user, String code) {
        if (user == null || code == null) {
            return false;
        }
        if (billingGrantRepository.existsByIdUserIdAndIdEntitlementCode(user.getId(), Entitlements.UNLOCK_ALL)) {
            return true;
        }
        BillingSubscription sub = current(user.getId());
        if (sub == null || !live(sub)) {
            return false;
        }
        return billingPlanEntitlementRepository.findByIdPlanId(sub.getPlanId()).stream()
                .anyMatch(row -> code.equals(row.getId().getEntitlementCode()));
    }

    @Transactional(readOnly = true)
    public void require(User user, String code) {
        if (!has(user, code)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ENTITLEMENT_REQUIRED");
        }
    }

    @Transactional(readOnly = true)
    public Integer limit(User user, String code) {
        if (user == null) {
            return 0;
        }
        if (billingGrantRepository.existsByIdUserIdAndIdEntitlementCode(user.getId(), Entitlements.UNLOCK_ALL)) {
            return null;
        }
        BillingSubscription sub = current(user.getId());
        if (sub == null || !live(sub)) {
            return 0;
        }
        return billingPlanEntitlementRepository.findByIdPlanId(sub.getPlanId()).stream()
                .filter(row -> code.equals(row.getId().getEntitlementCode()))
                .map(BillingPlanEntitlement::getLimitValue)
                .findFirst()
                .orElse(0);
    }

    @Transactional(readOnly = true)
    public Set<String> codes(User user) {
        if (user == null) {
            return Set.of();
        }
        if (billingGrantRepository.existsByIdUserIdAndIdEntitlementCode(user.getId(), Entitlements.UNLOCK_ALL)) {
            return billingEntitlementRepository.findAllByOrderBySortOrderAsc().stream()
                    .map(BillingEntitlement::getCode)
                    .collect(java.util.stream.Collectors.toSet());
        }
        BillingSubscription sub = current(user.getId());
        if (sub == null || !live(sub)) {
            return Set.of();
        }
        Set<String> codes = new HashSet<>();
        for (BillingPlanEntitlement row : billingPlanEntitlementRepository.findByIdPlanId(sub.getPlanId())) {
            codes.add(row.getId().getEntitlementCode());
        }
        return codes;
    }

    @Transactional(readOnly = true)
    public Map<String, Integer> limits(User user) {
        Map<String, Integer> out = new HashMap<>();
        if (user == null) {
            return out;
        }
        if (billingGrantRepository.existsByIdUserIdAndIdEntitlementCode(user.getId(), Entitlements.UNLOCK_ALL)) {
            return out;
        }
        BillingSubscription sub = current(user.getId());
        if (sub == null || !live(sub)) {
            return out;
        }
        for (BillingPlanEntitlement row : billingPlanEntitlementRepository.findByIdPlanId(sub.getPlanId())) {
            if (row.getLimitValue() != null) {
                out.put(row.getId().getEntitlementCode(), row.getLimitValue());
            }
        }
        return out;
    }

    @Transactional(readOnly = true)
    public BillingSubscription current(UUID userId) {
        return billingSubscriptionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).orElse(null);
    }

    public boolean live(BillingSubscription sub) {
        if (sub == null) {
            return false;
        }
        if (sub.getStatus() == SubscriptionStatus.TRIAL || sub.getStatus() == SubscriptionStatus.ACTIVE) {
            return true;
        }
        return sub.getStatus() == SubscriptionStatus.CANCELLED
                && sub.getCurrentPeriodEnd() != null
                && Instant.now().isBefore(sub.getCurrentPeriodEnd());
    }

    @Transactional(readOnly = true)
    public List<BillingPlanEntitlement> planRows(UUID planId) {
        return billingPlanEntitlementRepository.findByIdPlanId(planId);
    }
}
