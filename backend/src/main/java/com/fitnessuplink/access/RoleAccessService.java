package com.fitnessuplink.access;

import com.fitnessuplink.access.dto.PermissionDto;
import com.fitnessuplink.access.dto.RoleAccessDto;
import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.catalog.AppRoleRepository;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.common.exception.ResourceNotFoundException;
import com.fitnessuplink.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoleAccessService {

    private final AppRoleRepository appRoleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;

    @Transactional(readOnly = true)
    public List<PermissionDto> listPermissions() {
        return permissionRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toPermissionDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RoleAccessDto> listRoles() {
        return appRoleRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toRoleDto)
                .toList();
    }

    @Transactional
    public RoleAccessDto updatePermissions(UUID roleId, List<String> codes) {
        AppRole role = appRoleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        if (UserService.SUPER_ADMIN_CODE.equals(role.getCode())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot change super admin permissions");
        }
        Set<String> unique = new LinkedHashSet<>();
        if (codes != null) {
            for (String code : codes) {
                if (code != null && !code.isBlank()) {
                    unique.add(code.trim());
                }
            }
        }
        List<Permission> resolved = new ArrayList<>();
        for (String code : unique) {
            Permission permission = permissionRepository.findByCode(code)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown permission: " + code));
            resolved.add(permission);
        }
        rolePermissionRepository.deleteByRoleId(roleId);
        rolePermissionRepository.flush();
        for (Permission permission : resolved) {
            rolePermissionRepository.save(new RolePermission(roleId, permission.getId()));
        }
        return toRoleDto(role);
    }

    private RoleAccessDto toRoleDto(AppRole role) {
        boolean locked = UserService.SUPER_ADMIN_CODE.equals(role.getCode());
        List<String> codes = locked
                ? permissionRepository.findAllByOrderBySortOrderAsc().stream().map(Permission::getCode).toList()
                : rolePermissionRepository.findCodesByRoleId(role.getId());
        return new RoleAccessDto(
                role.getId(),
                role.getCode(),
                role.getLabel(),
                role.getDescription(),
                role.getCategory(),
                role.getCategoryLabel(),
                role.isSelectable(),
                locked,
                codes
        );
    }

    private PermissionDto toPermissionDto(Permission permission) {
        return new PermissionDto(
                permission.getId(),
                permission.getCode(),
                permission.getModule(),
                permission.getModuleLabel(),
                permission.getLabel(),
                permission.getDescription(),
                permission.getSortOrder()
        );
    }
}
