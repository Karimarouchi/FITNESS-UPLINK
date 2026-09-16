package com.fitnessuplink.services;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.services.dto.ServicesDtos.CreateQuoteRequest;
import com.fitnessuplink.services.dto.ServicesDtos.QuoteRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/services")
@RequiredArgsConstructor
public class ServiceQuoteRequestController {

    private final ServiceQuoteRequestService serviceQuoteRequestService;

    @PostMapping("/providers/{id}/quote-requests")
    public QuoteRequestDto create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody CreateQuoteRequest request
    ) {
        return serviceQuoteRequestService.create(principal.getUser(), id, request);
    }

    @GetMapping("/quote-requests/sent")
    public List<QuoteRequestDto> sent(@AuthenticationPrincipal UserPrincipal principal) {
        return serviceQuoteRequestService.sent(principal.getUser());
    }

    @GetMapping("/quote-requests/received")
    public List<QuoteRequestDto> received(@AuthenticationPrincipal UserPrincipal principal) {
        return serviceQuoteRequestService.received(principal.getUser());
    }

    @PostMapping("/quote-requests/{id}/handle")
    public QuoteRequestDto handle(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return serviceQuoteRequestService.markHandled(principal.getUser(), id);
    }

    @PostMapping("/quote-requests/attachments")
    public Map<String, UUID> uploadAttachment(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) {
        return Map.of("uploadId", serviceQuoteRequestService.uploadAttachment(principal.getUser(), file));
    }

    @GetMapping("/quote-requests/{id}/attachments/{uploadId}")
    public ResponseEntity<Resource> attachment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID uploadId
    ) {
        UploadService.LoadedUpload loaded = serviceQuoteRequestService.attachment(principal.getUser(), id, uploadId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.upload().getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + loaded.upload().getOriginalFilename() + "\"")
                .body(loaded.resource());
    }
}
