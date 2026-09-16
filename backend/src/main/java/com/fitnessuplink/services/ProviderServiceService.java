package com.fitnessuplink.services;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.services.dto.ServicesDtos.ProviderServiceDto;
import com.fitnessuplink.services.dto.ServicesDtos.UpsertProviderServiceRequest;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProviderServiceService {

    private final ProviderServiceRepository providerServiceRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public List<ProviderServiceDto> list(User provider) {
        requireProvider(provider);
        return withCategoryNames(providerServiceRepository.findByProviderIdOrderByCreatedAtDesc(provider.getId()));
    }

    @Transactional
    public ProviderServiceDto create(User provider, UpsertProviderServiceRequest request) {
        requireProvider(provider);
        ServiceCategory category = requireCategory(request.categoryId());
        Instant now = Instant.now();
        ProviderService entity = ProviderService.builder()
                .id(UUID.randomUUID())
                .providerId(provider.getId())
                .categoryId(category.getId())
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        apply(entity, request);
        return toDto(providerServiceRepository.save(entity), category.getName());
    }

    @Transactional
    public ProviderServiceDto update(User provider, UUID id, UpsertProviderServiceRequest request) {
        requireProvider(provider);
        ProviderService entity = requireOwned(provider.getId(), id);
        ServiceCategory category = requireCategory(request.categoryId());
        entity.setCategoryId(category.getId());
        apply(entity, request);
        entity.setUpdatedAt(Instant.now());
        return toDto(providerServiceRepository.save(entity), category.getName());
    }

    @Transactional
    public void delete(User provider, UUID id) {
        requireProvider(provider);
        providerServiceRepository.delete(requireOwned(provider.getId(), id));
    }

    private ProviderService requireOwned(UUID providerId, UUID id) {
        return providerServiceRepository.findByIdAndProviderId(id, providerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SERVICE_NOT_FOUND"));
    }

    private ServiceCategory requireCategory(UUID categoryId) {
        if (categoryId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CATEGORY_REQUIRED");
        }
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "CATEGORY_NOT_FOUND"));
    }

    private void apply(ProviderService entity, UpsertProviderServiceRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isBlank() || name.length() > 120) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SERVICE_NAME_INVALID");
        }
        entity.setName(name);
        entity.setDescription(request.description() == null || request.description().isBlank() ? null : request.description().trim());
        if (request.active() != null) {
            entity.setActive(request.active());
        }
    }

    private void requireProvider(User user) {
        permissionService.require(user, Permissions.SERVICES_MANAGE);
    }

    List<ProviderServiceDto> withCategoryNames(List<ProviderService> services) {
        Map<UUID, String> names = categoryRepository.findAllById(services.stream().map(ProviderService::getCategoryId).distinct().toList())
                .stream().collect(Collectors.toMap(ServiceCategory::getId, ServiceCategory::getName));
        return services.stream()
                .map(s -> toDto(s, names.getOrDefault(s.getCategoryId(), "—")))
                .toList();
    }

    private ProviderServiceDto toDto(ProviderService entity, String categoryName) {
        return new ProviderServiceDto(
                entity.getId(),
                entity.getCategoryId(),
                categoryName,
                entity.getName(),
                entity.getDescription(),
                entity.isActive()
        );
    }
}
