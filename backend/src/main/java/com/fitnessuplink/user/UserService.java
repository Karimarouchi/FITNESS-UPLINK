package com.fitnessuplink.user;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.audit.AuditAction;
import com.fitnessuplink.audit.AuditLogService;
import com.fitnessuplink.auth.token.RefreshTokenRepository;
import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.catalog.Country;
import com.fitnessuplink.catalog.ProfileField;
import com.fitnessuplink.catalog.RoleProfileField;
import com.fitnessuplink.catalog.RoleProfileFieldRepository;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.common.exception.ResourceNotFoundException;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.user.dto.BulkUserActionResponse;
import com.fitnessuplink.user.dto.CountrySummary;
import com.fitnessuplink.user.dto.OnboardingStep;
import com.fitnessuplink.user.dto.RoleSummary;
import com.fitnessuplink.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UserService {

    public static final String SUPER_ADMIN_CODE = "SUPER_ADMIN";
    private static final Pattern UPLOAD_ID = Pattern.compile("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"");

    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final RoleProfileFieldRepository roleProfileFieldRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PermissionService permissionService;
    private final AuditLogService auditLogService;

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

    @Transactional
    public UserResponse setEnabled(UUID actorId, UUID targetId, boolean enabled) {
        User target = requireManageableUser(actorId, targetId);
        target.setEnabled(enabled);
        if (!enabled) {
            target.setLockedUntil(null);
            refreshTokenRepository.revokeAllActiveByUserId(target.getId());
        }
        UserResponse response = toResponse(userRepository.save(target));
        auditLogService.recordForUser(actorId, targetId, enabled ? AuditAction.ACCOUNT_UNBLOCKED : AuditAction.ACCOUNT_BLOCKED);
        return response;
    }

    @Transactional
    public void deleteUser(UUID actorId, UUID targetId) {
        User target = requireManageableUser(actorId, targetId);
        refreshTokenRepository.revokeAllActiveByUserId(target.getId());
        auditLogService.recordForUser(actorId, targetId, AuditAction.ACCOUNT_DELETED);
        userRepository.delete(target);
    }

    @Transactional
    public BulkUserActionResponse bulkAction(UUID actorId, List<UUID> ids, String action) {
        String normalized = action == null ? "" : action.trim().toUpperCase();
        if (!Set.of("BLOCK", "UNBLOCK", "DELETE").contains(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid user action");
        }
        int processed = 0;
        int skipped = 0;
        for (UUID id : ids.stream().distinct().toList()) {
            try {
                if ("DELETE".equals(normalized)) {
                    deleteUser(actorId, id);
                } else {
                    setEnabled(actorId, id, "UNBLOCK".equals(normalized));
                }
                processed++;
            } catch (ApiException ex) {
                skipped++;
            }
        }
        if (processed == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No eligible users for this action");
        }
        return new BulkUserActionResponse(processed, skipped);
    }

    private User requireManageableUser(UUID actorId, UUID targetId) {
        if (actorId.equals(targetId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot manage your own account");
        }
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (target.isSuperAdmin()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot manage a super admin account");
        }
        return target;
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
        List<UserProfileValue> values = user.isSuperAdmin()
                ? List.of()
                : userProfileValueRepository.findByUserId(user.getId());
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getDisplayName(),
                toRoleSummary(user.getAppRole()),
                toCountrySummary(user.getCountry()),
                user.isOnboardingCompleted(),
                resolveStep(user, values),
                user.getCreatedAt(),
                avatarUploadId(values),
                user.getVerificationStatus() == null ? "pending" : user.getVerificationStatus(),
                user.isEnabled(),
                permissionService.codesFor(user),
                user.getProfessionalIntent(),
                user.isProfileVisible(),
                user.isEmailVerified(),
                user.getSelectedPlan(),
                user.getSelectedPlanInterval(),
                user.getPendingPlan(),
                user.getPendingPlanInterval()
        );
    }

    public OnboardingStep resolveStep(User user) {
        List<UserProfileValue> values = user.isSuperAdmin()
                ? List.of()
                : userProfileValueRepository.findByUserId(user.getId());
        return resolveStep(user, values);
    }

    private OnboardingStep resolveStep(User user, List<UserProfileValue> values) {
        AppRole role = user.getAppRole();
        if (role != null && SUPER_ADMIN_CODE.equals(role.getCode())) {
            return OnboardingStep.DONE;
        }
        if (role == null) {
            return OnboardingStep.ROLE;
        }
        if (needsIntent(role) && isBlank(user.getProfessionalIntent())) {
            return OnboardingStep.INTENT;
        }
        if (user.getCountry() == null) {
            return OnboardingStep.COUNTRY;
        }
        if (!requiredProfileComplete(role.getId(), values)) {
            return OnboardingStep.PROFILE;
        }
        if (!user.hasSelectedPlan()) {
            return OnboardingStep.PLAN;
        }
        if (user.hasSelectedPlan() && !user.isOnboardingCompleted()) {
            return OnboardingStep.PAYMENT;
        }
        if (user.isOnboardingCompleted()) {
            return OnboardingStep.DONE;
        }
        return OnboardingStep.PROFILE;
    }

    public boolean hasRequiredProfile(User user) {
        if (user.getAppRole() == null) {
            return false;
        }
        return requiredProfileComplete(
                user.getAppRole().getId(),
                userProfileValueRepository.findByUserId(user.getId())
        );
    }

    private boolean requiredProfileComplete(UUID roleId, List<UserProfileValue> values) {
        Map<String, String> byKey = values.stream()
                .filter(item -> item.getValue() != null)
                .collect(Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (left, right) -> left));
        for (RoleProfileField mapping : roleProfileFieldRepository.findByRole_IdOrderBySortOrderAsc(roleId)) {
            ProfileField field = mapping.getField();
            if ("verification_status".equals(field.getFieldKey())) {
                continue;
            }
            boolean required = mapping.getRequiredOverride() != null
                    ? mapping.getRequiredOverride()
                    : field.isRequired();
            if (!required) {
                continue;
            }
            if (isMissing(field.getFieldType(), byKey.get(field.getFieldKey()))) {
                return false;
            }
        }
        return true;
    }

    public boolean isProfileVisibleComplete(User user) {
        if (user.getAppRole() == null) {
            return false;
        }
        List<UserProfileValue> values = userProfileValueRepository.findByUserId(user.getId());
        Map<String, String> byKey = values.stream()
                .filter(item -> item.getValue() != null)
                .collect(Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (left, right) -> left));
        for (RoleProfileField mapping : roleProfileFieldRepository.findByRole_IdOrderBySortOrderAsc(user.getAppRole().getId())) {
            if (!mapping.isVisibilityRequired()) {
                continue;
            }
            ProfileField field = mapping.getField();
            if (isMissing(field.getFieldType(), byKey.get(field.getFieldKey()))) {
                return false;
            }
        }
        return true;
    }

    public static boolean needsIntent(AppRole role) {
        return role != null && "CANDIDATE".equals(role.getCode());
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public static boolean isMissing(String fieldType, String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        String type = fieldType == null ? "TEXT" : fieldType.toUpperCase();
        String trimmed = value.trim();
        if (Set.of("FILES", "PHOTO", "FILE").contains(type)) {
            return !UPLOAD_ID.matcher(trimmed).find();
        }
        if (Set.of("TAGS", "MULTISELECT", "REPEATABLE", "COUNTRY_MULTI").contains(type)) {
            return trimmed.equals("[]") || trimmed.equals("null") || trimmed.equals("{}");
        }
        if ("MONEY".equals(type)) {
            return !trimmed.contains("\"amount\"") || trimmed.contains("\"amount\":\"\"") || trimmed.contains("\"amount\": \"\"");
        }
        return false;
    }

    private UUID avatarUploadId(List<UserProfileValue> values) {
        return values.stream()
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
