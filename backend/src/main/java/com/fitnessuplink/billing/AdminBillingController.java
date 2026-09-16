package com.fitnessuplink.billing;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.billing.dto.BillingDtos.AdminPlanUpdate;
import com.fitnessuplink.billing.dto.BillingDtos.AdminSubscriberDto;
import com.fitnessuplink.billing.dto.BillingDtos.EntitlementDto;
import com.fitnessuplink.billing.dto.BillingDtos.PlanDto;
import com.fitnessuplink.billing.dto.BillingDtos.TestCardDto;
import com.fitnessuplink.billing.dto.BillingDtos.UpsertTestCardRequest;
import com.fitnessuplink.billing.dto.BillingDtos.VatDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/billing")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PERM_admin.config')")
public class AdminBillingController {

    private final AdminBillingService adminBillingService;
    private final BillingService billingService;

    @GetMapping("/plans")
    public List<PlanDto> plans(@AuthenticationPrincipal UserPrincipal principal) {
        return adminBillingService.plans(principal.getUser());
    }

    @GetMapping("/entitlements")
    public List<EntitlementDto> entitlements(@AuthenticationPrincipal UserPrincipal principal) {
        return adminBillingService.entitlements(principal.getUser());
    }

    @PutMapping("/plans/{id}")
    public PlanDto updatePlan(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody AdminPlanUpdate request
    ) {
        return adminBillingService.updatePlan(principal.getUser(), id, request);
    }

    @GetMapping("/subscribers")
    public List<AdminSubscriberDto> subscribers(@AuthenticationPrincipal UserPrincipal principal) {
        return adminBillingService.subscribers(principal.getUser());
    }

    @GetMapping("/failures")
    public List<BillingPayment> failures(@AuthenticationPrincipal UserPrincipal principal) {
        return adminBillingService.failures(principal.getUser());
    }

    @GetMapping("/test-cards")
    public List<TestCardDto> testCards(@AuthenticationPrincipal UserPrincipal principal) {
        return adminBillingService.testCards(principal.getUser());
    }

    @PostMapping("/test-cards")
    public TestCardDto saveCard(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpsertTestCardRequest request
    ) {
        return adminBillingService.saveCard(principal.getUser(), request);
    }

    @GetMapping("/vat")
    public List<VatDto> vat(@AuthenticationPrincipal UserPrincipal principal) {
        return adminBillingService.vat(principal.getUser());
    }

    @PutMapping("/vat")
    public VatDto saveVat(@AuthenticationPrincipal UserPrincipal principal, @RequestBody VatDto request) {
        return adminBillingService.saveVat(principal.getUser(), request);
    }

    @PostMapping("/renew-now")
    public Map<String, String> renewNow(@AuthenticationPrincipal UserPrincipal principal) {
        adminBillingService.plans(principal.getUser());
        billingService.convertDueTrials();
        return Map.of("status", "ok");
    }
}
