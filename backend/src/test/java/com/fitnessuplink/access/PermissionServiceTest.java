package com.fitnessuplink.access;

import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermissionServiceTest {

    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private RolePermissionRepository rolePermissionRepository;

    private PermissionService service;
    private UUID roleId;

    @BeforeEach
    void setUp() {
        service = new PermissionService(permissionRepository, rolePermissionRepository);
        roleId = UUID.randomUUID();
    }

    @Test
    void superAdminHasEveryPermission() {
        User admin = user("SUPER_ADMIN", false);
        assertTrue(service.has(admin, Permissions.ADMIN_ROLES));
        service.require(admin, Permissions.HIRE_PIPELINE);
    }

    @Test
    void employerNeedsAssignedCode() {
        User employer = user("EMPLOYER", true);
        when(rolePermissionRepository.existsByRoleIdAndCode(roleId, Permissions.HIRE_PIPELINE)).thenReturn(true);
        when(rolePermissionRepository.existsByRoleIdAndCode(roleId, Permissions.HIRE_JOBS_APPLY)).thenReturn(false);
        assertTrue(service.has(employer, Permissions.HIRE_PIPELINE));
        assertFalse(service.has(employer, Permissions.HIRE_JOBS_APPLY));
        ApiException error = assertThrows(ApiException.class, () -> service.require(employer, Permissions.HIRE_JOBS_APPLY));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }

    @Test
    void codesForSuperAdminReturnsCatalog() {
        Permission permission = new Permission();
        permission.setCode(Permissions.ADMIN_ROLES);
        when(permissionRepository.findAllByOrderBySortOrderAsc()).thenReturn(List.of(permission));
        assertEquals(List.of(Permissions.ADMIN_ROLES), service.codesFor(user("SUPER_ADMIN", false)));
    }

    private User user(String code, boolean onboarded) {
        AppRole role = new AppRole();
        role.setId(roleId);
        role.setCode(code);
        User user = User.builder()
                .id(UUID.randomUUID())
                .email(code.toLowerCase() + "@test.com")
                .passwordHash("hash")
                .onboardingCompleted(onboarded)
                .build();
        user.setAppRole(role);
        return user;
    }
}
