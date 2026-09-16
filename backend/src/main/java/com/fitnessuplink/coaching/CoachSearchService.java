package com.fitnessuplink.coaching;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.coaching.dto.CoachSearchQuery;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachCardDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachPageDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachProfileDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachServiceDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.ReviewDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.TopCoachDto;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
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
public class CoachSearchService {

    private final CoachSearchRepository coachSearchRepository;
    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final CoachServiceRepository coachServiceRepository;
    private final CoachingReviewRepository coachingReviewRepository;
    private final CoachingBookingRepository coachingBookingRepository;
    private final UploadService uploadService;
    private final ObjectMapper objectMapper;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload photo(User viewer, UUID coachId, UUID uploadId) {
        requireViewerOrSelf(viewer, coachId);
        User coach = requireCoach(coachId);
        UploadService.LoadedUpload loaded = uploadService.load(coach.getId(), uploadId);
        if (!"professional_photo".equals(loaded.upload().getFieldKey())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FILE_NOT_AVAILABLE");
        }
        return loaded;
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload publicPhoto(UUID coachId, UUID uploadId) {
        User coach = requireCoach(coachId);
        UploadService.LoadedUpload loaded = uploadService.load(coach.getId(), uploadId);
        if (!"professional_photo".equals(loaded.upload().getFieldKey())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FILE_NOT_AVAILABLE");
        }
        return loaded;
    }

    @Transactional(readOnly = true)
    public List<TopCoachDto> topRated(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 20);
        List<UUID> ids = coachSearchRepository.topRated(safeLimit);
        Map<UUID, User> byId = userRepository.findByIdIn(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        return ids.stream()
                .map(byId::get)
                .filter(u -> u != null)
                .map(this::toTopCard)
                .toList();
    }

    private TopCoachDto toTopCard(User coach) {
        Map<String, String> values = valuesOf(coach.getId());
        List<CoachingReview> reviews = coachingReviewRepository.findByCoachIdOrderByCreatedAtDesc(coach.getId());
        Map<UUID, User> reviewers = userRepository.findByIdIn(reviews.stream().map(CoachingReview::getClientId).toList()).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        CoachingReview best = reviews.stream()
                .filter(r -> r.getComment() != null && !r.getComment().isBlank())
                .max((a, b) -> Integer.compare(a.getRating(), b.getRating()))
                .orElse(reviews.isEmpty() ? null : reviews.get(0));
        ReviewDto highlight = best == null ? null : new ReviewDto(
                best.getId(),
                reviewers.containsKey(best.getClientId()) ? reviewers.get(best.getClientId()).getDisplayName() : "Client",
                best.getRating(),
                best.getComment(),
                best.getCreatedAt()
        );
        return new TopCoachDto(
                coach.getId(),
                coach.getDisplayName(),
                text(values, "professional_title"),
                text(values, "city"),
                countryOf(coach),
                stringList(values.get("specialties")),
                firstUploadId(values.get("professional_photo")),
                averageRating(reviews),
                reviews.size(),
                highlight
        );
    }

    @Transactional(readOnly = true)
    public CoachPageDto search(User viewer, CoachSearchQuery query) {
        requireViewer(viewer);
        var page = coachSearchRepository.search(query);
        Map<UUID, User> byId = userRepository.findByIdIn(page.getContent()).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        List<CoachCardDto> items = page.getContent().stream()
                .map(byId::get)
                .filter(u -> u != null)
                .map(this::toCard)
                .toList();
        return new CoachPageDto(items, page.getTotalElements(), query.page(), query.size());
    }

    @Transactional(readOnly = true)
    public CoachProfileDto profile(User viewer, UUID coachId) {
        requireViewerOrSelf(viewer, coachId);
        User coach = requireCoach(coachId);
        Map<String, String> values = valuesOf(coach.getId());
        List<CoachServiceDto> services = coachServiceRepository.findByCoachIdAndActiveTrueOrderByCreatedAtDesc(coach.getId()).stream()
                .map(s -> new CoachServiceDto(s.getId(), s.getName(), s.getDescription(), s.getDurationMinutes(), s.getPriceAmount(), s.getPriceCurrency(), s.isActive()))
                .toList();
        List<CoachingReview> reviews = coachingReviewRepository.findByCoachIdOrderByCreatedAtDesc(coach.getId());
        Map<UUID, User> reviewers = userRepository.findByIdIn(reviews.stream().map(CoachingReview::getClientId).toList()).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        List<ReviewDto> reviewDtos = reviews.stream()
                .map(r -> new ReviewDto(
                        r.getId(),
                        reviewers.containsKey(r.getClientId()) ? reviewers.get(r.getClientId()).getDisplayName() : "Client",
                        r.getRating(),
                        r.getComment(),
                        r.getCreatedAt()
                ))
                .toList();
        double averageRating = averageRating(reviews);
        boolean canReview = false;
        Integer myRating = null;
        if (!viewer.getId().equals(coach.getId())) {
            myRating = coachingReviewRepository.findByCoachIdAndClientId(coach.getId(), viewer.getId())
                    .map(r -> (int) r.getRating())
                    .orElse(null);
            canReview = myRating == null
                    && coachingBookingRepository.existsByCoachIdAndClientIdAndStatus(
                    coach.getId(), viewer.getId(), CoachingBookingStatus.COMPLETED);
        }
        return new CoachProfileDto(
                coach.getId(),
                coach.getDisplayName(),
                text(values, "professional_title"),
                text(values, "biography"),
                text(values, "city"),
                countryOf(coach),
                stringList(values.get("specialties")),
                firstUploadId(values.get("professional_photo")),
                averageRating,
                reviews.size(),
                services,
                reviewDtos,
                canReview,
                myRating
        );
    }

    User requireCoach(UUID coachId) {
        User coach = userRepository.findById(coachId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COACH_NOT_FOUND"));
        String intent = coach.getProfessionalIntent();
        boolean isCoach = coach.isCandidate() && ("COACHING".equals(intent) || "BOTH".equals(intent));
        if (!isCoach || !coach.isOnboardingCompleted() || !coach.isProfileVisible()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "COACH_NOT_FOUND");
        }
        return coach;
    }

    private void requireViewer(User viewer) {
        if (viewer.isSuperAdmin()) {
            return;
        }
        permissionService.require(viewer, Permissions.COACHING_DISCOVER);
    }

    private void requireViewerOrSelf(User viewer, UUID coachId) {
        if (viewer.isSuperAdmin() || viewer.getId().equals(coachId)) {
            return;
        }
        permissionService.require(viewer, Permissions.COACHING_DISCOVER);
    }

    private CoachCardDto toCard(User coach) {
        Map<String, String> values = valuesOf(coach.getId());
        List<CoachingReview> reviews = coachingReviewRepository.findByCoachIdOrderByCreatedAtDesc(coach.getId());
        List<CoachService> services = coachServiceRepository.findByCoachIdAndActiveTrueOrderByCreatedAtDesc(coach.getId());
        var cheapest = services.stream().min((a, b) -> a.getPriceAmount().compareTo(b.getPriceAmount()));
        return new CoachCardDto(
                coach.getId(),
                coach.getDisplayName(),
                text(values, "professional_title"),
                text(values, "city"),
                countryOf(coach),
                stringList(values.get("specialties")),
                firstUploadId(values.get("professional_photo")),
                averageRating(reviews),
                reviews.size(),
                cheapest.map(CoachService::getPriceAmount).orElse(null),
                cheapest.map(CoachService::getPriceCurrency).orElse(null)
        );
    }

    private double averageRating(List<CoachingReview> reviews) {
        if (reviews.isEmpty()) {
            return 0.0;
        }
        return reviews.stream().mapToInt(CoachingReview::getRating).average().orElse(0.0);
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

    private UUID firstUploadId(String json) {
        JsonNode node = tree(json);
        if (node == null) {
            return null;
        }
        JsonNode first = node.isArray() ? (node.isEmpty() ? null : node.get(0)) : node;
        if (first == null) {
            return null;
        }
        JsonNode idNode = first.get("id");
        if (idNode == null || !idNode.isTextual()) {
            return null;
        }
        try {
            return UUID.fromString(idNode.asText());
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
}
