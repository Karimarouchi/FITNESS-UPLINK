package com.fitnessuplink.admin;

import com.fitnessuplink.admin.dto.UpdateVerificationCheckRequest;
import com.fitnessuplink.admin.dto.VerificationAccountDto;
import com.fitnessuplink.admin.dto.VerificationDossierDto;
import com.fitnessuplink.user.dto.UpdateVerificationRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/verifications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminVerificationController {

    private final AdminVerificationService adminVerificationService;

    @GetMapping
    public List<VerificationAccountDto> list(
            @RequestParam(required = false) String group,
            @RequestParam(required = false) String status
    ) {
        return adminVerificationService.list(group, status);
    }

    @GetMapping("/{id}")
    public VerificationDossierDto dossier(@PathVariable UUID id) {
        return adminVerificationService.dossier(id);
    }

    @PatchMapping("/{id}")
    public VerificationAccountDto update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateVerificationRequest request
    ) {
        return adminVerificationService.update(id, request.status());
    }

    @PatchMapping("/{id}/checks/{key}")
    public VerificationDossierDto updateCheck(
            @PathVariable UUID id,
            @PathVariable String key,
            @Valid @RequestBody UpdateVerificationCheckRequest request
    ) {
        return adminVerificationService.updateCheck(id, key, request.status());
    }
}
