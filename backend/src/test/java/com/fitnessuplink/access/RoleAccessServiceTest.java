package com.fitnessuplink.access;

import com.fitnessuplink.access.dto.RoleAccessDto;
import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.catalog.AppRoleRepository;
import com.fitnessuplink.common.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoleAccessServiceTest {

    @Mock
    private AppRoleRepository appRoleRepository;
    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private RolePermissionRepository rolePermissionRepository;

    private RoleAccessService service;
    private UUID superAdminId;

    @BeforeEach
    void setUp() {
        service = new RoleAccessService(appRoleRepository, permissionRepository, rolePermissionRepository);
        superAdminId = UUID.randomUUID();
    }

    @Test
    void cannotChangeSuperAdminPermissions() {
        AppRole role = new AppRole();
        role.setId(superAdminId);
        role.setCode("SUPER_ADMIN");
        when(appRoleRepository.findById(superAdminId)).thenReturn(Optional.of(role));

        ApiException error = assertThrows(
                ApiException.class,
                () -> service.updatePermissions(superAdminId, List.of("admin.users"))
        );
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(rolePermissionRepository, never()).deleteByRoleId(superAdminId);
    }

    @Test
    void superAdminRoleIsLockedWithAllCodes() {
        AppRole role = new AppRole();
        role.setId(superAdminId);
        role.setCode("SUPER_ADMIN");
        role.setLabel("Super admin");
        role.setCategory("ADMIN");
        role.setCategoryLabel("Administration");
        Permission permission = new Permission();
        permission.setCode("admin.roles");
        when(appRoleRepository.findAllByOrderBySortOrderAsc()).thenReturn(List.of(role));
        when(permissionRepository.findAllByOrderBySortOrderAsc()).thenReturn(List.of(permission));

        RoleAccessDto dto = service.listRoles().getFirst();
        assertTrue(dto.locked());
        assertEquals(List.of("admin.roles"), dto.permissionCodes());
    }
}
