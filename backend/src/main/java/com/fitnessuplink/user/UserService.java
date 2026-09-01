package com.fitnessuplink.user;

import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.catalog.Country;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.common.exception.ResourceNotFoundException;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.user.dto.CountrySummary;
import com.fitnessuplink.user.dto.OnboardingStep;
import com.fitnessuplink.user.dto.RoleSummary;
import com.fitnessuplink.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UserService {

    public static final String SUPER_ADMIN_CODE = "SUPER_ADMIN";
    private static final Pattern UPLOAD_ID = Pattern.compile("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"");

    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(UUID id) {
        return userRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional(readOnly = true)
    public List<User> findReviewableUsers(String group, String status) {
        return userRepository.findAll().stream()
                .filter(user -> user.getAppRole() != null && !SUPER_ADMIN_CODE.equals(user.getAppRole().getCode()))
                .filter(user -> matchesGroup(user, group))
                .filter(user -> status == null || status.isBlank() || status.equals(user.getVerificationStatus()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findForVerification(String group, String status) {
        return findReviewableUsers(group, status).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserResponse updateVerification(UUID id, String status) {
        if (!Set.of("pending", "verified", "rejected").contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid verification status");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.isSuperAdmin()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot change super admin verification");
        }
        user.setVerificationStatus(status);
        return toResponse(userRepository.save(user));
    }

    private boolean matchesGroup(User user, String group) {
        if (group == null || group.isBlank() || "all".equals(group)) {
            return user.isCandidate() || user.isBusiness();
        }
        if ("candidates".equals(group)) {
            return user.isCandidate();
        }
        if ("business".equals(group)) {
            return user.isBusiness();
        }
        return false;
    }

    public UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getDisplayName(),
                toRoleSummary(user.getAppRole()),
                toCountrySummary(user.getCountry()),
                user.isOnboardingCompleted(),
                resolveStep(user),
                user.getCreatedAt(),
                avatarUploadId(user.getId()),
                user.getVerificationStatus() == null ? "pending" : user.getVerificationStatus()
        );
    }

    public static OnboardingStep resolveStep(User user) {
        AppRole role = user.getAppRole();
        if (user.isOnboardingCompleted() || (role != null && SUPER_ADMIN_CODE.equals(role.getCode()))) {
            return OnboardingStep.DONE;
        }
        if (role == null) {
            return OnboardingStep.ROLE;
        }
        if (user.getCountry() == null) {
            return OnboardingStep.COUNTRY;
        }
        return OnboardingStep.PROFILE;
    }

    private UUID avatarUploadId(UUID userId) {
        return userProfileValueRepository.findByUserId(userId).stream()
                .filter(item -> {
                    String key = item.getFieldKey();
                    return key != null && (key.contains("photo") || key.contains("logo"));
                })
                .map(UserProfileValue::getValue)
                .map(this::firstUploadId)
                .filter(id -> id != null)
                .findFirst()
                .orElse(null);
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

    private RoleSummary toRoleSummary(AppRole role) {
        if (role == null) {
            return null;
        }
        return new RoleSummary(
                role.getId(),
                role.getCode(),
                role.getLabel(),
                role.getCategory(),
                role.getCategoryLabel(),
                role.getIcon()
        );
    }

    private CountrySummary toCountrySummary(Country country) {
        if (country == null) {
            return null;
        }
        return new CountrySummary(
                country.getId(),
                country.getIso2(),
                country.getName(),
                country.getFlagEmoji(),
                country.getCallingCode()
        );
    }
}
