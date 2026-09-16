package com.fitnessuplink.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.catalog.CountryRepository;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.services.dto.ServicesDtos.CreateQuoteRequest;
import com.fitnessuplink.services.dto.ServicesDtos.QuoteRequestDto;
import com.fitnessuplink.talent.dto.FileRef;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.dto.CountrySummary;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServiceQuoteRequestService {

    private final ServiceQuoteRequestRepository quoteRequestRepository;
    private final ProviderSearchService providerSearchService;
    private final UserRepository userRepository;
    private final CountryRepository countryRepository;
    private final UploadService uploadService;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;
    private final ServicesMailService servicesMailService;
    private final PermissionService permissionService;

    @Transactional
    public QuoteRequestDto create(User requester, UUID providerId, CreateQuoteRequest request) {
        permissionService.require(requester, Permissions.SERVICES_BROWSE);
        User provider = providerSearchService.requireProvider(providerId);
        String companyName = request.companyName() == null ? "" : request.companyName().trim();
        String message = request.message() == null ? "" : request.message().trim();
        if (companyName.isBlank() || message.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REQUEST_INCOMPLETE");
        }
        ServiceQuoteRequest entity = ServiceQuoteRequest.builder()
                .id(UUID.randomUUID())
                .providerId(provider.getId())
                .requesterId(requester.getId())
                .companyName(companyName)
                .countryId(request.countryId())
                .city(request.city() == null || request.city().isBlank() ? null : request.city().trim())
                .message(message)
                .attachmentsJson(writeAttachments(request.attachmentUploadIds()))
                .status(ServiceQuoteStatus.NEW)
                .createdAt(Instant.now())
                .build();
        quoteRequestRepository.save(entity);

        notificationService.notify(provider.getId(), NotifyCategory.CONTACT,
                "Nouvelle demande de devis", companyName + " souhaite un devis.",
                "Voir", "/app/services/requests");
        servicesMailService.enqueueQuoteRequest(provider, requester, companyName, message);

        return toDto(entity, provider, requester);
    }

    @Transactional(readOnly = true)
    public List<QuoteRequestDto> sent(User requester) {
        permissionService.require(requester, Permissions.SERVICES_BROWSE);
        return enrich(quoteRequestRepository.findByRequesterIdOrderByCreatedAtDesc(requester.getId()));
    }

    @Transactional(readOnly = true)
    public List<QuoteRequestDto> received(User provider) {
        permissionService.require(provider, Permissions.SERVICES_MANAGE);
        return enrich(quoteRequestRepository.findByProviderIdOrderByCreatedAtDesc(provider.getId()));
    }

    @Transactional
    public QuoteRequestDto markHandled(User provider, UUID id) {
        permissionService.require(provider, Permissions.SERVICES_MANAGE);
        ServiceQuoteRequest entity = quoteRequestRepository.findByIdAndProviderId(id, provider.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND"));
        entity.setStatus(ServiceQuoteStatus.HANDLED);
        entity.setHandledAt(Instant.now());
        quoteRequestRepository.save(entity);
        User requester = userRepository.findById(entity.getRequesterId()).orElse(null);
        User provider2 = userRepository.findById(entity.getProviderId()).orElse(null);
        return toDto(entity, provider2, requester);
    }

    @Transactional
    public UUID uploadAttachment(User requester, MultipartFile file) {
        permissionService.require(requester, Permissions.SERVICES_BROWSE);
        return uploadService.storeHireFile(requester.getId(), file).getId();
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload attachment(User viewer, UUID requestId, UUID uploadId) {
        ServiceQuoteRequest entity = quoteRequestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND"));
        if (!viewer.isSuperAdmin() && !entity.getProviderId().equals(viewer.getId()) && !entity.getRequesterId().equals(viewer.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        boolean attached = attachmentsOf(entity).stream().anyMatch(ref -> ref.id().equals(uploadId));
        if (!attached) {
            throw new ApiException(HttpStatus.NOT_FOUND, "ATTACHMENT_NOT_FOUND");
        }
        return uploadService.loadAny(uploadId);
    }

    private List<QuoteRequestDto> enrich(List<ServiceQuoteRequest> rows) {
        List<UUID> userIds = rows.stream()
                .flatMap(r -> java.util.stream.Stream.of(r.getProviderId(), r.getRequesterId()))
                .distinct().toList();
        Map<UUID, User> users = userRepository.findByIdIn(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        return rows.stream()
                .map(r -> toDto(r, users.get(r.getProviderId()), users.get(r.getRequesterId())))
                .toList();
    }

    private QuoteRequestDto toDto(ServiceQuoteRequest entity, User provider, User requester) {
        CountrySummary country = entity.getCountryId() == null ? null : countryRepository.findById(entity.getCountryId())
                .map(c -> new CountrySummary(c.getId(), c.getIso2(), c.getName(), c.getFlagEmoji(), c.getCallingCode()))
                .orElse(null);
        return new QuoteRequestDto(
                entity.getId(),
                entity.getProviderId(),
                provider == null ? null : provider.getDisplayName(),
                entity.getRequesterId(),
                requester == null ? null : requester.getDisplayName(),
                entity.getCompanyName(),
                country,
                entity.getCity(),
                entity.getMessage(),
                attachmentsOf(entity),
                entity.getStatus().name(),
                entity.getCreatedAt(),
                entity.getHandledAt()
        );
    }

    private String writeAttachments(List<UUID> uploadIds) {
        if (uploadIds == null || uploadIds.isEmpty()) {
            return null;
        }
        try {
            List<Map<String, String>> refs = new ArrayList<>();
            for (UUID id : uploadIds) {
                refs.add(Map.of("id", id.toString()));
            }
            return objectMapper.writeValueAsString(refs);
        } catch (Exception ex) {
            return null;
        }
    }

    private List<FileRef> attachmentsOf(ServiceQuoteRequest entity) {
        String json = entity.getAttachmentsJson();
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            JsonNode array = objectMapper.readTree(json);
            List<FileRef> refs = new ArrayList<>();
            for (JsonNode item : array) {
                JsonNode idNode = item.get("id");
                if (idNode == null) {
                    continue;
                }
                UUID uploadId = UUID.fromString(idNode.asText());
                var upload = uploadService.loadAny(uploadId).upload();
                refs.add(new FileRef(uploadId, upload.getOriginalFilename(), upload.getContentType(), upload.getSizeBytes()));
            }
            return refs;
        } catch (Exception ex) {
            return List.of();
        }
    }
}
