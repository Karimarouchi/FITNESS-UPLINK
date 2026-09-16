package com.fitnessuplink.jobs;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.jobs.dto.OpportunityDto;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.talent.TalentPipelineRepository;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.dto.CountrySummary;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OpportunityService {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };
    private static final Pattern UPLOAD_ID = Pattern.compile("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"");

    private final JobOfferRepository jobOfferRepository;
    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final TalentPipelineRepository talentPipelineRepository;
    private final ObjectMapper objectMapper;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public List<OpportunityDto> listPublished(User candidate, String query) {
        if (!candidate.isCandidate() || !candidate.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        permissionService.require(candidate, Permissions.HIRE_JOBS_APPLY);
        Instant now = Instant.now();
        String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        List<JobOffer> offers = jobOfferRepository.findByStatusOrderByUpdatedAtDesc(JobOfferStatus.PUBLISHED).stream()
                .filter(offer -> offer.getExpiresAt() == null || offer.getExpiresAt().isAfter(now))
                .toList();
        Set<UUID> employerIds = offers.stream().map(JobOffer::getEmployerId).collect(Collectors.toSet());
        Map<UUID, User> employers = userRepository.findAllById(employerIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Map<UUID, Map<String, String>> values = valuesOf(employerIds);
        return offers.stream()
                .map(offer -> {
                    User employer = employers.get(offer.getEmployerId());
                    if (employer == null || !employer.isOnboardingCompleted()) {
                        return null;
                    }
                    boolean applied = talentPipelineRepository.existsByEmployerIdAndCandidateIdAndJobOfferId(
                            employer.getId(),
                            candidate.getId(),
                            offer.getId()
                    );
                    OpportunityDto dto = toDto(offer, employer, values.getOrDefault(employer.getId(), Map.of()), applied);
                    if (!needle.isBlank() && !matches(dto, needle)) {
                        return null;
                    }
                    return dto;
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public OpportunityDto getPublished(User candidate, UUID offerId) {
        if (!candidate.isCandidate() || !candidate.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        permissionService.require(candidate, Permissions.HIRE_JOBS_APPLY);
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND"));
        if (offer.getStatus() != JobOfferStatus.PUBLISHED
                || (offer.getExpiresAt() != null && offer.getExpiresAt().isBefore(Instant.now()))) {
            throw new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND");
        }
        User employer = userRepository.findById(offer.getEmployerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND"));
        if (!employer.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND");
        }
        boolean applied = talentPipelineRepository.existsByEmployerIdAndCandidateIdAndJobOfferId(
                employer.getId(),
                candidate.getId(),
                offer.getId()
        );
        return toDto(offer, employer, valuesOf(Set.of(employer.getId())).getOrDefault(employer.getId(), Map.of()), applied);
    }

    private OpportunityDto toDto(JobOffer offer, User employer, Map<String, String> values, boolean applied) {
        return new OpportunityDto(
                offer.getId(),
                offer.getTitle(),
                offer.getPosition(),
                offer.getLocation(),
                offer.getContractType(),
                offer.getSalaryAmount(),
                offer.getSalaryCurrency(),
                readList(offer.getLanguages()),
                readList(offer.getCertifications()),
                offer.getExperience(),
                offer.getDescription(),
                organizationName(employer, values),
                firstUploadId(values.get("organization_logo")),
                countryOf(employer),
                applied,
                offer.getExpiresAt(),
                offer.getCreatedAt()
        );
    }

    private boolean matches(OpportunityDto dto, String needle) {
        String haystack = String.join(" ",
                nullToEmpty(dto.title()),
                nullToEmpty(dto.position()),
                nullToEmpty(dto.location()),
                nullToEmpty(dto.employerName()),
                String.join(" ", dto.languages()),
                String.join(" ", dto.certifications())
        ).toLowerCase(Locale.ROOT);
        return haystack.contains(needle);
    }

    private String organizationName(User employer, Map<String, String> values) {
        for (String key : List.of("trade_name", "legal_name", "company_name", "gym_name", "academy_name", "organization_name")) {
            String value = values.get(key);
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return employer.getDisplayName();
    }

    private CountrySummary countryOf(User user) {
        if (user.getCountry() == null) {
            return null;
        }
        return new CountrySummary(
                user.getCountry().getId(),
                user.getCountry().getIso2(),
                user.getCountry().getName(),
                user.getCountry().getFlagEmoji(),
                user.getCountry().getCallingCode()
        );
    }

    private Map<UUID, Map<String, String>> valuesOf(Set<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return userProfileValueRepository.findByUserIdIn(userIds).stream()
                .filter(item -> item.getValue() != null)
                .collect(Collectors.groupingBy(
                        UserProfileValue::getUserId,
                        Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (left, right) -> left)
                ));
    }

    private List<String> readList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> items = objectMapper.readValue(json, STRING_LIST);
            return items == null ? List.of() : items.stream().filter(item -> item != null && !item.isBlank()).toList();
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private UUID firstUploadId(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        Matcher matcher = UPLOAD_ID.matcher(json);
        if (!matcher.find()) {
            return null;
        }
        try {
            return UUID.fromString(matcher.group(1));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
