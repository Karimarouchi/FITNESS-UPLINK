package com.fitnessuplink.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.billing.EntitlementService;
import com.fitnessuplink.catalog.CountryRepository;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.services.dto.ProviderSearchQuery;
import com.fitnessuplink.services.dto.ServicesDtos.ProviderCardDto;
import com.fitnessuplink.services.dto.ServicesDtos.ProviderPageDto;
import com.fitnessuplink.services.dto.ServicesDtos.ProviderProfileDto;
import com.fitnessuplink.services.dto.ServicesDtos.ProviderServiceDto;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.dto.CountrySummary;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProviderSearchService {

    private final ProviderSearchRepository providerSearchRepository;
    private final ProviderServiceRepository providerServiceRepository;
    private final ProviderServiceService providerServiceService;
    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final CountryRepository countryRepository;
    private final UploadService uploadService;
    private final EntitlementService entitlementService;
    private final ObjectMapper objectMapper;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public ProviderPageDto search(User viewer, ProviderSearchQuery query) {
        requireViewer(viewer);
        var page = providerSearchRepository.search(query);
        Map<UUID, User> byId = userRepository.findByIdIn(page.getContent()).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        List<ProviderCardDto> items = page.getContent().stream()
                .map(byId::get)
                .filter(u -> u != null)
                .map(this::toCard)
                .toList();
        return new ProviderPageDto(items, page.getTotalElements(), query.page(), query.size());
    }

    @Transactional(readOnly = true)
    public ProviderProfileDto profile(User viewer, UUID providerId) {
        requireViewerOrSelf(viewer, providerId);
        User provider = requireProvider(providerId);
        Map<String, String> values = valuesOf(provider.getId());
        List<ProviderServiceDto> services = providerServiceService.withCategoryNames(
                providerServiceRepository.findByProviderIdAndActiveTrueOrderByCreatedAtDesc(provider.getId())
        );
        List<CountrySummary> coverage = countryRepository.findAllById(uuidList(values.get("coverage_countries"))).stream()
                .map(this::toCountrySummary)
                .toList();
        return new ProviderProfileDto(
                provider.getId(),
                displayNameOf(provider, values),
                firstUploadId(values.get("organization_logo")),
                text(values, "organization_description"),
                text(values, "website"),
                text(values, "org_phone"),
                text(values, "org_email"),
                text(values, "org_city"),
                countryOf(provider),
                coverage,
                uploadIds(values.get("portfolio_photos")),
                stringList(values.get("portfolio_videos")),
                services,
                subscribed(provider.getId())
        );
    }

    User requireProvider(UUID providerId) {
        User provider = userRepository.findById(providerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PROVIDER_NOT_FOUND"));
        boolean isProvider = provider.getAppRole() != null && "SERVICE_PROVIDER".equals(provider.getAppRole().getCode());
        if (!isProvider || !provider.isOnboardingCompleted() || !provider.isProfileVisible()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PROVIDER_NOT_FOUND");
        }
        return provider;
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload file(User viewer, UUID providerId, UUID uploadId) {
        requireViewerOrSelf(viewer, providerId);
        User provider = requireProvider(providerId);
        UploadService.LoadedUpload loaded = uploadService.load(provider.getId(), uploadId);
        String key = loaded.upload().getFieldKey();
        if (!"organization_logo".equals(key) && !"portfolio_photos".equals(key)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FILE_NOT_AVAILABLE");
        }
        return loaded;
    }

    private void requireViewer(User viewer) {
        if (viewer.isSuperAdmin()) {
            return;
        }
        permissionService.require(viewer, Permissions.SERVICES_BROWSE);
    }

    private void requireViewerOrSelf(User viewer, UUID providerId) {
        if (viewer.isSuperAdmin() || viewer.getId().equals(providerId)) {
            return;
        }
        permissionService.require(viewer, Permissions.SERVICES_BROWSE);
    }

    private ProviderCardDto toCard(User provider) {
        Map<String, String> values = valuesOf(provider.getId());
        List<String> categoryNames = providerServiceService.withCategoryNames(
                providerServiceRepository.findByProviderIdAndActiveTrueOrderByCreatedAtDesc(provider.getId())
        ).stream().map(dto -> dto.categoryName()).distinct().toList();
        return new ProviderCardDto(
                provider.getId(),
                displayNameOf(provider, values),
                firstUploadId(values.get("organization_logo")),
                text(values, "organization_description"),
                text(values, "org_city"),
                countryOf(provider),
                categoryNames,
                subscribed(provider.getId())
        );
    }

    private boolean subscribed(UUID userId) {
        var sub = entitlementService.current(userId);
        return sub != null && entitlementService.live(sub);
    }

    private String displayNameOf(User user, Map<String, String> values) {
        String tradeName = text(values, "trade_name");
        if (tradeName != null) {
            return tradeName;
        }
        String legalName = text(values, "legal_name");
        if (legalName != null) {
            return legalName;
        }
        return user.getDisplayName();
    }

    private Map<String, String> valuesOf(UUID userId) {
        return userProfileValueRepository.findByUserId(userId).stream()
                .filter(item -> item.getValue() != null)
                .collect(Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (left, right) -> left));
    }

    private CountrySummary countryOf(User user) {
        if (user.getCountry() == null) {
            return null;
        }
        return toCountrySummary(user.getCountry());
    }

    private CountrySummary toCountrySummary(com.fitnessuplink.catalog.Country country) {
        return new CountrySummary(country.getId(), country.getIso2(), country.getName(), country.getFlagEmoji(), country.getCallingCode());
    }

    private String text(Map<String, String> values, String key) {
        String value = values.get(key);
        return value == null || value.isBlank() ? null : value;
    }

    private List<String> stringList(String json) {
        JsonNode node = tree(json);
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<String> items = new ArrayList<>();
        for (JsonNode item : node) {
            if (item.isTextual() && !item.asText().isBlank()) {
                items.add(item.asText());
            }
        }
        return items;
    }

    private List<UUID> uuidList(String json) {
        List<UUID> ids = new ArrayList<>();
        for (String raw : stringList(json)) {
            try {
                ids.add(UUID.fromString(raw));
            } catch (IllegalArgumentException ignored) {
                // skip malformed entries
            }
        }
        return ids;
    }

    private List<UUID> uploadIds(String json) {
        JsonNode node = tree(json);
        if (node == null) {
            return List.of();
        }
        JsonNode array = node.isArray() ? node : objectMapper.createArrayNode().add(node);
        List<UUID> ids = new ArrayList<>();
        for (JsonNode item : array) {
            JsonNode idNode = item.get("id");
            if (idNode != null && idNode.isTextual()) {
                try {
                    ids.add(UUID.fromString(idNode.asText()));
                } catch (IllegalArgumentException ignored) {
                    // skip malformed entries
                }
            }
        }
        return ids;
    }

    private UUID firstUploadId(String json) {
        List<UUID> ids = uploadIds(json);
        return ids.isEmpty() ? null : ids.get(0);
    }

    private JsonNode tree(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(json);
        } catch (Exception ex) {
            return null;
        }
    }

}
