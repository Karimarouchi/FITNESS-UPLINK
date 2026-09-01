package com.fitnessuplink.talent;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.talent.dto.CandidateCardResponse;
import com.fitnessuplink.talent.dto.CandidateDetailResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/candidates")
@RequiredArgsConstructor
public class CandidateController {

    private final CandidateService candidateService;

    @GetMapping
    public List<CandidateCardResponse> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String q
    ) {
        return candidateService.list(principal.getUser(), q);
    }

    @GetMapping("/{id}")
    public CandidateDetailResponse detail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return candidateService.detail(principal.getUser(), id);
    }

    @PostMapping("/{id}/favorite")
    public ResponseEntity<Void> favorite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        candidateService.addFavorite(principal.getUser(), id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/favorite")
    public ResponseEntity<Void> unfavorite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        candidateService.removeFavorite(principal.getUser(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/files/{uploadId}")
    public ResponseEntity<Resource> file(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID uploadId
    ) {
        UploadService.LoadedUpload loaded = candidateService.file(principal.getUser(), id, uploadId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.upload().getContentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline()
                                .filename(loaded.upload().getOriginalFilename(), StandardCharsets.UTF_8)
                                .build()
                                .toString()
                )
                .body(loaded.resource());
    }
}
