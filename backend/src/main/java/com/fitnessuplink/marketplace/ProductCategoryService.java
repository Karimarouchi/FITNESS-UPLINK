package com.fitnessuplink.marketplace;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ProductCategoryDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.UpsertCategoryRequest;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductCategoryService {

    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public List<ProductCategoryDto> list() {
        return categoryRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductCategoryDto> listAllForAdmin(User admin) {
        requireAdmin(admin);
        return categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ProductCategoryDto create(User admin, UpsertCategoryRequest request) {
        requireAdmin(admin);
        Instant now = Instant.now();
        ProductCategory category = ProductCategory.builder()
                .id(UUID.randomUUID())
                .name(validateName(request))
                .sortOrder(request.sortOrder() == null ? 0 : request.sortOrder())
                .active(request.active() == null || request.active())
                .createdAt(now)
                .updatedAt(now)
                .build();
        return toDto(categoryRepository.save(category));
    }

    @Transactional
    public ProductCategoryDto update(User admin, UUID id, UpsertCategoryRequest request) {
        requireAdmin(admin);
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND"));
        category.setName(validateName(request));
        if (request.sortOrder() != null) {
            category.setSortOrder(request.sortOrder());
        }
        if (request.active() != null) {
            category.setActive(request.active());
        }
        category.setUpdatedAt(Instant.now());
        return toDto(categoryRepository.save(category));
    }

    @Transactional
    public void delete(User admin, UUID id) {
        requireAdmin(admin);
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND"));
        if (productRepository.countByCategoryIdAndActiveTrue(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "CATEGORY_IN_USE");
        }
        categoryRepository.delete(category);
    }

    private String validateName(UpsertCategoryRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isBlank() || name.length() > 80) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CATEGORY_NAME_INVALID");
        }
        return name;
    }

    private void requireAdmin(User admin) {
        if (admin.isSuperAdmin()) {
            return;
        }
        permissionService.require(admin, Permissions.ADMIN_CONFIG);
    }

    private ProductCategoryDto toDto(ProductCategory category) {
        return new ProductCategoryDto(category.getId(), category.getName(), category.getSortOrder(), category.isActive());
    }
}
