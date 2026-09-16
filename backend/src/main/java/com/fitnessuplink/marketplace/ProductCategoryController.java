package com.fitnessuplink.marketplace;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ProductCategoryDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.UpsertCategoryRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ProductCategoryController {

    private final ProductCategoryService productCategoryService;

    @GetMapping("/v1/marketplace/categories")
    public List<ProductCategoryDto> categories() {
        return productCategoryService.list();
    }

    @GetMapping("/v1/admin/marketplace/categories")
    public List<ProductCategoryDto> adminCategories(@AuthenticationPrincipal UserPrincipal principal) {
        return productCategoryService.listAllForAdmin(principal.getUser());
    }

    @PostMapping("/v1/admin/marketplace/categories")
    public ProductCategoryDto create(@AuthenticationPrincipal UserPrincipal principal, @RequestBody UpsertCategoryRequest request) {
        return productCategoryService.create(principal.getUser(), request);
    }

    @PutMapping("/v1/admin/marketplace/categories/{id}")
    public ProductCategoryDto update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpsertCategoryRequest request
    ) {
        return productCategoryService.update(principal.getUser(), id, request);
    }

    @DeleteMapping("/v1/admin/marketplace/categories/{id}")
    public void delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        productCategoryService.delete(principal.getUser(), id);
    }
}
