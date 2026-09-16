package com.fitnessuplink.access;

import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;

    @Transactional(readOnly = true)
    public boolean has(User user, String code) {
        if (user == null || code == null || code.isBlank()) {
            return false;
        }
        if (user.isSuperAdmin()) {
            return true;
        }
        if (user.getAppRole() == null) {
            return false;
        }
        if (!rolePermissionRepository.existsByRoleIdAndCode(user.getAppRole().getId(), code)) {
            return false;
        }
        return allowedByIntent(user, code);
    }

    @Transactional(readOnly = true)
    public void require(User user, String code) {
        if (user != null && user.isSuperAdmin()) {
            return;
        }
        if (user == null || !user.isOnboardingCompleted() || !has(user, code)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
    }

    @Transactional(readOnly = true)
    public List<String> codesFor(User user) {
        if (user == null) {
            return List.of();
        }
        if (user.isSuperAdmin()) {
            return permissionRepository.findAllByOrderBySortOrderAsc().stream()
                    .map(Permission::getCode)
                    .toList();
        }
        if (user.getAppRole() == null) {
            return List.of();
        }
        return rolePermissionRepository.findCodesByRoleId(user.getAppRole().getId()).stream()
                .filter(code -> allowedByIntent(user, code))
                .toList();
    }

    private boolean allowedByIntent(User user, String code) {
        if (!user.isCandidate()) {
            return true;
        }
        String intent = user.getProfessionalIntent() == null ? "JOB" : user.getProfessionalIntent();
        if ("JOB".equals(intent) && (Permissions.COACHING_MANAGE.equals(code) || Permissions.COACHING_DISCOVER.equals(code))) {
            return false;
        }
        if ("COACHING".equals(intent) && (
                Permissions.HIRE_JOBS_APPLY.equals(code)
                        || Permissions.HIRE_APPLICATIONS_VIEW.equals(code)
                        || Permissions.HIRE_CONTRACTS_CANDIDATE.equals(code)
        )) {
            return false;
        }
        return true;
    }
}
