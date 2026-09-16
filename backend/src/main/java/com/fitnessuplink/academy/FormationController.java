package com.fitnessuplink.academy;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.academy.dto.AcademyDtos.FormationDetailDto;
import com.fitnessuplink.academy.dto.AcademyDtos.FormationDto;
import com.fitnessuplink.academy.dto.AcademyDtos.FormationPageDto;
import com.fitnessuplink.academy.dto.AcademyDtos.FormationSessionDto;
import com.fitnessuplink.academy.dto.AcademyDtos.ParticipantDto;
import com.fitnessuplink.academy.dto.AcademyDtos.UpsertFormationRequest;
import com.fitnessuplink.academy.dto.AcademyDtos.UpsertSessionRequest;
import com.fitnessuplink.onboarding.UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/academy")
@RequiredArgsConstructor
public class FormationController {

    private final FormationCatalogService formationCatalogService;
    private final FormationService formationService;

    @GetMapping("/formations")
    public FormationPageDto search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String contentType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return formationCatalogService.search(q, contentType, page, size);
    }

    @GetMapping("/formations/{id}")
    public FormationDetailDto detail(@PathVariable UUID id) {
        return formationCatalogService.detail(id);
    }

    @GetMapping("/formations/{id}/files/{uploadId}")
    public ResponseEntity<Resource> photo(@PathVariable UUID id, @PathVariable UUID uploadId) {
        UploadService.LoadedUpload loaded = formationCatalogService.photo(id, uploadId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.upload().getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + loaded.upload().getOriginalFilename() + "\"")
                .body(loaded.resource());
    }

    @GetMapping("/mine")
    public List<FormationDto> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return formationService.list(principal.getUser());
    }

    @PostMapping("/mine")
    public FormationDto create(@AuthenticationPrincipal UserPrincipal principal, @RequestBody UpsertFormationRequest request) {
        return formationService.create(principal.getUser(), request);
    }

    @PutMapping("/mine/{id}")
    public FormationDto update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpsertFormationRequest request
    ) {
        return formationService.update(principal.getUser(), id, request);
    }

    @DeleteMapping("/mine/{id}")
    public void delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        formationService.delete(principal.getUser(), id);
    }

    @PostMapping("/mine/image")
    public Map<String, UUID> uploadImage(@AuthenticationPrincipal UserPrincipal principal, @RequestParam("file") MultipartFile file) {
        return Map.of("uploadId", formationService.uploadImage(principal.getUser(), file));
    }

    @GetMapping("/mine/{id}/sessions")
    public List<FormationSessionDto> sessions(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return formationService.sessions(principal.getUser(), id);
    }

    @PostMapping("/mine/{id}/sessions")
    public FormationSessionDto createSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpsertSessionRequest request
    ) {
        return formationService.createSession(principal.getUser(), id, request);
    }

    @DeleteMapping("/mine/{id}/sessions/{sessionId}")
    public void deleteSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID sessionId
    ) {
        formationService.deleteSession(principal.getUser(), id, sessionId);
    }

    @GetMapping("/mine/{id}/sessions/{sessionId}/participants")
    public List<ParticipantDto> participants(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID sessionId
    ) {
        return formationService.participants(principal.getUser(), id, sessionId);
    }
}
