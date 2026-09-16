package com.fitnessuplink.services;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.services.dto.ServicesDtos.ServiceCategoryDto;
import com.fitnessuplink.services.dto.ServicesDtos.UpsertCategoryRequest;
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
public class ServiceCategoryService {

    private final ServiceCategoryRepository categoryRepository;
    private final ProviderServiceRepository providerServiceRepository;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public List<ServiceCategoryDto> list() {
        return categoryRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceCategoryDto> listAllForAdmin(User admin) {
        requireAdmin(admin);
        return categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ServiceCategoryDto create(User admin, UpsertCategoryRequest request) {
        requireAdmin(admin);
        String name = validateName(request);
        Instant now = Instant.now();
        ServiceCategory category = ServiceCategory.builder()
                .id(UUID.randomUUID())
                .name(name)
                .sortOrder(request.sortOrder() == null ? 0 : request.sortOrder())
                .active(request.active() == null || request.active())
                .createdAt(now)
                .updatedAt(now)
                .build();
        return toDto(categoryRepository.save(category));
    }

    @Transactional
    public ServiceCategoryDto update(User admin, UUID id, UpsertCategoryRequest request) {
        requireAdmin(admin);
        ServiceCategory category = categoryRepository.findById(id)
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
        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND"));
        if (!providerServiceRepository.findByCategoryIdAndActiveTrue(id).isEmpty()) {
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

    private ServiceCategoryDto toDto(ServiceCategory category) {
        return new ServiceCategoryDto(category.getId(), category.getName(), category.getSortOrder(), category.isActive());
    }
}
