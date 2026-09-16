package com.fitnessuplink.services;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.services.dto.ProviderSearchQuery;
import com.fitnessuplink.services.dto.ServicesDtos.ProviderPageDto;
import com.fitnessuplink.services.dto.ServicesDtos.ProviderProfileDto;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/v1/services/providers")
@RequiredArgsConstructor
public class ProviderSearchController {

    private final ProviderSearchService providerSearchService;

    @GetMapping
    public ProviderPageDto search(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID countryId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return providerSearchService.search(principal.getUser(), ProviderSearchQuery.of(q, countryId, categoryId, page, size));
    }

    @GetMapping("/{id}")
    public ProviderProfileDto profile(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return providerSearchService.profile(principal.getUser(), id);
    }

    @GetMapping("/{id}/files/{uploadId}")
    public ResponseEntity<Resource> file(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID uploadId
    ) {
        UploadService.LoadedUpload loaded = providerSearchService.file(principal.getUser(), id, uploadId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.upload().getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + loaded.upload().getOriginalFilename() + "\"")
                .body(loaded.resource());
    }
}
