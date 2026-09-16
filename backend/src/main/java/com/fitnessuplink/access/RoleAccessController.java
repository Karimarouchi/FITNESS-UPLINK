package com.fitnessuplink.access;

import com.fitnessuplink.access.dto.PermissionDto;
import com.fitnessuplink.access.dto.RoleAccessDto;
import com.fitnessuplink.access.dto.UpdateRolePermissionsRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/roles")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PERM_admin.roles')")
public class RoleAccessController {

    private final RoleAccessService roleAccessService;

    @GetMapping
    public List<RoleAccessDto> list() {
        return roleAccessService.listRoles();
    }

    @GetMapping("/permissions")
    public List<PermissionDto> permissions() {
        return roleAccessService.listPermissions();
    }

    @PutMapping("/{id}/permissions")
    public RoleAccessDto updatePermissions(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRolePermissionsRequest request
    ) {
        return roleAccessService.updatePermissions(id, request.permissionCodes());
    }
}
