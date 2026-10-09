package com.fitnessuplink.marketplace;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.AdminMarketplaceStatsDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.AdminProductPageDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.AdminProductRowDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.AdminSupplierRowDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.HideProductRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/marketplace")
@RequiredArgsConstructor
public class MarketplaceAdminController {

    private final MarketplaceAdminService adminService;

    @GetMapping("/stats")
    public AdminMarketplaceStatsDto stats(@AuthenticationPrincipal UserPrincipal principal) {
        return adminService.stats(principal.getUser());
    }

    @GetMapping("/products")
    public AdminProductPageDto products(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID supplierId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return adminService.products(principal.getUser(), q, status, categoryId, supplierId, page, size);
    }

    @PostMapping("/products/{id}/hide")
    public AdminProductRowDto hide(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody HideProductRequest request
    ) {
        return adminService.hide(principal.getUser(), id, request == null ? null : request.reason());
    }

    @PostMapping("/products/{id}/unhide")
    public AdminProductRowDto unhide(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return adminService.unhide(principal.getUser(), id);
    }

    @GetMapping("/suppliers")
    public List<AdminSupplierRowDto> suppliers(@AuthenticationPrincipal UserPrincipal principal) {
        return adminService.suppliers(principal.getUser());
    }
}
