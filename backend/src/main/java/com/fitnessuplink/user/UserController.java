package com.fitnessuplink.user;

import com.fitnessuplink.audit.AuditLogService;
import com.fitnessuplink.audit.dto.AuditDtos.AuditLogPageDto;
import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.user.dto.BulkUserActionRequest;
import com.fitnessuplink.user.dto.BulkUserActionResponse;
import com.fitnessuplink.user.dto.UpdateUserEnabledRequest;
import com.fitnessuplink.user.dto.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAuthority('PERM_admin.users')")
    public List<UserResponse> list() {
        return userService.findAll();
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasAuthority('PERM_admin.users')")
    public BulkUserActionResponse bulk(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody BulkUserActionRequest request
    ) {
        return userService.bulkAction(principal.getId(), request.ids(), request.action());
    }

    @PatchMapping("/{id}/enabled")
    @PreAuthorize("hasAuthority('PERM_admin.users')")
    public UserResponse setEnabled(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserEnabledRequest request
    ) {
        return userService.setEnabled(principal.getId(), id, request.enabled());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_admin.users')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        userService.deleteUser(principal.getId(), id);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or #id.equals(principal.id)")
    public UserResponse getById(@PathVariable UUID id) {
        return userService.findById(id);
    }

    @GetMapping("/{id}/activity")
    @PreAuthorize("hasAuthority('PERM_admin.users')")
    public AuditLogPageDto activity(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return auditLogService.activityOf(id, page, size);
    }
}
