package com.fitnessuplink.talent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.talent.dto.CandidateCardResponse;
import com.fitnessuplink.talent.dto.CandidateDetailResponse;
import com.fitnessuplink.talent.dto.ExperienceItem;
import com.fitnessuplink.talent.dto.FileRef;
import com.fitnessuplink.talent.dto.LanguageItem;
import com.fitnessuplink.talent.dto.MoneyValue;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.dto.CountrySummary;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private static final Pattern UPLOAD_ID = Pattern.compile("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"");
    private static final Set<String> PUBLIC_FILES = Set.of("professional_photo", "organization_logo");
    private static final Set<String> MEDIA_FILES = Set.of("cv", "presentation_videos", "diplomas", "certifications");

    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final CandidateFavoriteRepository candidateFavoriteRepository;
    private final TalentPipelineRepository talentPipelineRepository;
    private final RecruitmentService recruitmentService;
    private final UploadService uploadService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<CandidateCardResponse> list(User viewer, String query) {
        requireViewer(viewer);
        String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        Map<UUID, TalentPipeline> latest = viewer.isBusiness() ? latestByCandidate(viewer.getId()) : Map.of();
        return userRepository.findByAppRole_CodeAndOnboardingCompletedTrue("CANDIDATE").stream()
                .map(candidate -> toCard(viewer.getId(), candidate, valuesOf(candidate.getId()), latest.get(candidate.getId())))
                .filter(card -> matches(card, needle))
                .toList();
    }

    @Transactional(readOnly = true)
    public CandidateDetailResponse detail(User viewer, UUID candidateId) {
        requireViewer(viewer);
        User candidate = requireCandidate(candidateId);
        Map<String, String> values = valuesOf(candidate.getId());
        boolean favorite = candidateFavoriteRepository.existsByEmployerIdAndCandidateId(viewer.getId(), candidate.getId());
        boolean canViewMedia = viewer.isSuperAdmin() || viewer.isVerified();
        return new CandidateDetailResponse(
                candidate.getId(),
                candidate.getFirstName(),
                candidate.getLastName(),
                candidate.getDisplayName(),
                text(values, "professional_title"),
                text(values, "biography"),
                text(values, "city"),
                countryOf(candidate),
                stringList(values.get("specialties")),
                experiences(values.get("experiences")),
                languages(values.get("spoken_languages")),
                canViewMedia ? files(values.get("certifications")) : List.of(),
                canViewMedia ? files(values.get("diplomas")) : List.of(),
                text(values, "availability"),
                availabilityLabel(text(values, "availability")),
                money(values.get("desired_salary")),
                firstUploadId(values.get("professional_photo")),
                candidate.isVerified(),
                favorite,
                recruitmentService.summariesForCandidate(viewer, candidate.getId()),
                candidate.getEmail(),
                text(values, "phone"),
                canViewMedia ? firstFile(values.get("cv")) : null,
                canViewMedia ? files(values.get("presentation_videos")) : List.of(),
                canViewMedia
        );
    }

    @Transactional
    public void addFavorite(User viewer, UUID candidateId) {
        requireEmployer(viewer);
        requireCandidate(candidateId);
        if (candidateFavoriteRepository.existsByEmployerIdAndCandidateId(viewer.getId(), candidateId)) {
            return;
        }
        candidateFavoriteRepository.save(new CandidateFavorite(viewer.getId(), candidateId, Instant.now()));
    }

    @Transactional
    public void removeFavorite(User viewer, UUID candidateId) {
        requireEmployer(viewer);
        candidateFavoriteRepository.deleteByEmployerIdAndCandidateId(viewer.getId(), candidateId);
    }

    @Transactional(readOnly = true)
    public List<CandidateCardResponse> listFavorites(User viewer) {
        requireEmployer(viewer);
        Map<UUID, TalentPipeline> latest = latestByCandidate(viewer.getId());
        return candidateFavoriteRepository.findByEmployerIdOrderByCreatedAtDesc(viewer.getId()).stream()
                .map(favorite -> userRepository.findById(favorite.getCandidateId()).orElse(null))
                .filter(candidate -> candidate != null && candidate.isCandidate() && candidate.isOnboardingCompleted())
                .map(candidate -> toCard(viewer.getId(), candidate, valuesOf(candidate.getId()), latest.get(candidate.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload file(User viewer, UUID candidateId, UUID uploadId) {
        requireViewer(viewer);
        requireCandidate(candidateId);
        UploadService.LoadedUpload loaded = uploadService.load(candidateId, uploadId);
        String key = loaded.upload().getFieldKey();
        if (PUBLIC_FILES.contains(key)) {
            return loaded;
        }
        if (MEDIA_FILES.contains(key) && (viewer.isSuperAdmin() || viewer.isVerified())) {
            return loaded;
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "This file is not available");
    }

    private CandidateCardResponse toCard(UUID viewerId, User candidate, Map<String, String> values, TalentPipeline latest) {
        return new CandidateCardResponse(
                candidate.getId(),
                candidate.getFirstName(),
                candidate.getLastName(),
                candidate.getDisplayName(),
                text(values, "professional_title"),
                text(values, "city"),
                countryOf(candidate),
                stringList(values.get("specialties")),
                experiences(values.get("experiences")),
                text(values, "availability"),
                availabilityLabel(text(values, "availability")),
                firstUploadId(values.get("professional_photo")),
                candidate.isVerified(),
                candidateFavoriteRepository.existsByEmployerIdAndCandidateId(viewerId, candidate.getId()),
                latest != null,
                latest == null ? null : latest.getStatus().name(),
                latest == null ? null : latest.getId(),
                candidate.getEmail()
        );
    }

    private Map<UUID, TalentPipeline> latestByCandidate(UUID employerId) {
        return talentPipelineRepository.findByEmployerIdOrderByUpdatedAtDesc(employerId).stream()
                .collect(Collectors.toMap(TalentPipeline::getCandidateId, row -> row, (first, ignored) -> first));
    }

    private boolean matches(CandidateCardResponse card, String needle) {
        if (needle.isBlank()) {
            return true;
        }
        String haystack = String.join(" ",
                nullToEmpty(card.displayName()),
                nullToEmpty(card.title()),
                nullToEmpty(card.city()),
                card.country() == null ? "" : card.country().name(),
                String.join(" ", card.specialties() == null ? List.of() : card.specialties())
        ).toLowerCase(Locale.ROOT);
        return haystack.contains(needle);
    }

    private User requireCandidate(UUID candidateId) {
        User candidate = userRepository.findById(candidateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Candidate not found"));
        if (!candidate.isCandidate() || !candidate.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Candidate not found");
        }
        return candidate;
    }

    private void requireViewer(User viewer) {
        if (viewer.isSuperAdmin()) {
            return;
        }
        if (viewer.isBusiness() && viewer.isOnboardingCompleted()) {
            return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    private void requireEmployer(User viewer) {
        if (viewer.isBusiness() && viewer.isOnboardingCompleted()) {
            return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
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
        return new CountrySummary(
                user.getCountry().getId(),
                user.getCountry().getIso2(),
                user.getCountry().getName(),
                user.getCountry().getFlagEmoji(),
                user.getCountry().getCallingCode()
        );
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

    private List<ExperienceItem> experiences(String json) {
        JsonNode node = tree(json);
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<ExperienceItem> items = new ArrayList<>();
        for (JsonNode item : node) {
            items.add(new ExperienceItem(
                    textNode(item, "title"),
                    textNode(item, "company"),
                    textNode(item, "start"),
                    textNode(item, "end"),
                    textNode(item, "description")
            ));
        }
        return items;
    }

    private List<LanguageItem> languages(String json) {
        JsonNode node = tree(json);
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<LanguageItem> items = new ArrayList<>();
        for (JsonNode item : node) {
            items.add(new LanguageItem(textNode(item, "language"), textNode(item, "level")));
        }
        return items;
    }

    private List<FileRef> files(String json) {
        JsonNode node = tree(json);
        if (node == null) {
            return List.of();
        }
        JsonNode array = node.isArray() ? node : objectMapper.createArrayNode().add(node);
        List<FileRef> items = new ArrayList<>();
        for (JsonNode item : array) {
            FileRef ref = fileRef(item);
            if (ref != null) {
                items.add(ref);
            }
        }
        return items;
    }

    private FileRef firstFile(String json) {
        List<FileRef> items = files(json);
        return items.isEmpty() ? null : items.getFirst();
    }

    private FileRef fileRef(JsonNode item) {
        if (item == null || !item.has("id")) {
            return null;
        }
        try {
            return new FileRef(
                    UUID.fromString(item.path("id").asText()),
                    item.path("name").asText(""),
                    item.path("contentType").asText(""),
                    item.path("size").asLong(0)
            );
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private MoneyValue money(String json) {
        JsonNode node = tree(json);
        if (node == null || node.path("amount").asText("").isBlank()) {
            return null;
        }
        return new MoneyValue(node.path("amount").asText(), node.path("currency").asText(""));
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

    private String textNode(JsonNode node, String field) {
        String value = node.path(field).asText("");
        return value.isBlank() ? null : value;
    }

    private String availabilityLabel(String value) {
        if (value == null) {
            return null;
        }
        return switch (value) {
            case "immediate" -> "Immédiate";
            case "2_weeks" -> "Sous 2 semaines";
            case "1_month" -> "Sous 1 mois";
            case "to_discuss" -> "À convenir";
            default -> value;
        };
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
