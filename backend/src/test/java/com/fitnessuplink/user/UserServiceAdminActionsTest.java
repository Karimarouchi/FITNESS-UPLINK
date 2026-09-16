package com.fitnessuplink.user;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.audit.AuditAction;
import com.fitnessuplink.audit.AuditLogService;
import com.fitnessuplink.auth.token.RefreshTokenRepository;
import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.catalog.RoleProfileFieldRepository;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceAdminActionsTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserProfileValueRepository userProfileValueRepository;
    @Mock
    private RoleProfileFieldRepository roleProfileFieldRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PermissionService permissionService;
    @Mock
    private AuditLogService auditLogService;

    private UserService service;
    private UUID actorId;

    @BeforeEach
    void setUp() {
        service = new UserService(
                userRepository,
                userProfileValueRepository,
                roleProfileFieldRepository,
                refreshTokenRepository,
                permissionService,
                auditLogService
        );
        actorId = UUID.randomUUID();
        lenient().when(permissionService.codesFor(any())).thenReturn(List.of());
    }

    @Test
    void blockRevokesSessions() {
        User target = member();
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userProfileValueRepository.findByUserId(target.getId())).thenReturn(List.of());

        var response = service.setEnabled(actorId, target.getId(), false);

        assertFalse(response.enabled());
        verify(refreshTokenRepository).revokeAllActiveByUserId(target.getId());
    }

    @Test
    void cannotBlockSelf() {
        ApiException ex = assertThrows(ApiException.class, () -> service.setEnabled(actorId, actorId, false));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(userRepository, never()).save(any());
    }

    @Test
    void cannotDeleteSuperAdmin() {
        User admin = superAdmin();
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));

        ApiException ex = assertThrows(ApiException.class, () -> service.deleteUser(actorId, admin.getId()));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(userRepository, never()).delete(any());
    }

    @Test
    void deleteRemovesUser() {
        User target = member();
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));

        service.deleteUser(actorId, target.getId());

        verify(refreshTokenRepository).revokeAllActiveByUserId(target.getId());
        verify(userRepository).delete(target);
    }

    @Test
    void blockWritesAuditLogEntry() {
        User target = member();
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userProfileValueRepository.findByUserId(target.getId())).thenReturn(List.of());

        service.setEnabled(actorId, target.getId(), false);

        verify(auditLogService).recordForUser(actorId, target.getId(), AuditAction.ACCOUNT_BLOCKED);
    }

    @Test
    void deleteWritesAuditLogEntry() {
        User target = member();
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));

        service.deleteUser(actorId, target.getId());

        verify(auditLogService).recordForUser(actorId, target.getId(), AuditAction.ACCOUNT_DELETED);
    }

    private User member() {
        return user("CANDIDATE");
    }

    private User superAdmin() {
        return user("SUPER_ADMIN");
    }

    private User user(String roleCode) {
        AppRole role = new AppRole();
        role.setId(UUID.randomUUID());
        role.setCode(roleCode);
        return User.builder()
                .id(UUID.randomUUID())
                .email(roleCode.toLowerCase() + "@example.com")
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .displayName("Jane Doe")
                .appRole(role)
                .enabled(true)
                .build();
    }
}
