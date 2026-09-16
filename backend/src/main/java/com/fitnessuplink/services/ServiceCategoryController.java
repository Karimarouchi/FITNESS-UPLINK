package com.fitnessuplink.services;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.services.dto.ServicesDtos.ServiceCategoryDto;
import com.fitnessuplink.services.dto.ServicesDtos.UpsertCategoryRequest;
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
public class ServiceCategoryController {

    private final ServiceCategoryService serviceCategoryService;

    @GetMapping("/v1/services/categories")
    public List<ServiceCategoryDto> categories() {
        return serviceCategoryService.list();
    }

    @GetMapping("/v1/admin/services/categories")
    public List<ServiceCategoryDto> adminCategories(@AuthenticationPrincipal UserPrincipal principal) {
        return serviceCategoryService.listAllForAdmin(principal.getUser());
    }

    @PostMapping("/v1/admin/services/categories")
    public ServiceCategoryDto create(@AuthenticationPrincipal UserPrincipal principal, @RequestBody UpsertCategoryRequest request) {
        return serviceCategoryService.create(principal.getUser(), request);
    }

    @PutMapping("/v1/admin/services/categories/{id}")
    public ServiceCategoryDto update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpsertCategoryRequest request
    ) {
        return serviceCategoryService.update(principal.getUser(), id, request);
    }

    @DeleteMapping("/v1/admin/services/categories/{id}")
    public void delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        serviceCategoryService.delete(principal.getUser(), id);
    }
}
