package com.fitnessuplink.services;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.services.dto.ServicesDtos.ProviderServiceDto;
import com.fitnessuplink.services.dto.ServicesDtos.UpsertProviderServiceRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/services/mine")
@RequiredArgsConstructor
public class ProviderServiceController {

    private final ProviderServiceService providerServiceService;

    @GetMapping
    public List<ProviderServiceDto> list(@AuthenticationPrincipal UserPrincipal principal) {
        return providerServiceService.list(principal.getUser());
    }

    @PostMapping
    public ProviderServiceDto create(@AuthenticationPrincipal UserPrincipal principal, @RequestBody UpsertProviderServiceRequest request) {
        return providerServiceService.create(principal.getUser(), request);
    }

    @PutMapping("/{id}")
    public ProviderServiceDto update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpsertProviderServiceRequest request
    ) {
        return providerServiceService.update(principal.getUser(), id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        providerServiceService.delete(principal.getUser(), id);
    }
}
