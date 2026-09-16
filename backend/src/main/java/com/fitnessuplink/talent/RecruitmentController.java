package com.fitnessuplink.talent;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.talent.dto.CreateRecruitmentRequest;
import com.fitnessuplink.talent.dto.FileRef;
import com.fitnessuplink.talent.dto.ReportRecruitmentRequest;
import com.fitnessuplink.talent.dto.RecruitmentConversationDto;
import com.fitnessuplink.talent.dto.RecruitmentDto;
import com.fitnessuplink.talent.dto.RecruitmentMessageDto;
import com.fitnessuplink.talent.dto.SendMessageRequest;
import com.fitnessuplink.talent.dto.UpdateRecruitmentNoteRequest;
import com.fitnessuplink.talent.dto.UpdateRecruitmentStatusRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/recruitments")
@RequiredArgsConstructor
public class RecruitmentController {

    private final RecruitmentService recruitmentService;

    @PostMapping
    public RecruitmentDto create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateRecruitmentRequest request
    ) {
        return recruitmentService.create(principal.getUser(), request);
    }

    @GetMapping
    public List<RecruitmentDto> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID jobOfferId,
            @RequestParam(required = false) Boolean direct,
            @RequestParam(required = false) PipelineStatus status,
            @RequestParam(required = false) String q
    ) {
        return recruitmentService.list(principal.getUser(), jobOfferId, direct, status, q);
    }

    @GetMapping("/inbox-count")
    public Map<String, Long> inboxCount(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("count", recruitmentService.inboxCount(principal.getUser()));
    }

    @GetMapping("/conversations")
    public List<RecruitmentConversationDto> conversations(@AuthenticationPrincipal UserPrincipal principal) {
        return recruitmentService.conversations(principal.getUser());
    }

    @GetMapping("/{id}")
    public RecruitmentDto get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return recruitmentService.get(principal.getUser(), id);
    }

    @PatchMapping("/{id}/status")
    public RecruitmentDto updateStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRecruitmentStatusRequest request
    ) {
        return recruitmentService.updateStatus(principal.getUser(), id, request);
    }

    @PatchMapping("/{id}/note")
    public RecruitmentDto updateNote(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpdateRecruitmentNoteRequest request
    ) {
        return recruitmentService.updateNote(principal.getUser(), id, request == null ? null : request.internalNote());
    }

    @PatchMapping("/{id}/archive")
    public RecruitmentDto archive(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return recruitmentService.archive(principal.getUser(), id);
    }

    @PostMapping("/{id}/block")
    public RecruitmentDto block(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return recruitmentService.block(principal.getUser(), id);
    }

    @GetMapping("/{id}/messages")
    public List<RecruitmentMessageDto> messages(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return recruitmentService.messages(principal.getUser(), id);
    }

    @PostMapping("/{id}/messages")
    public RecruitmentMessageDto sendMessage(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody SendMessageRequest request
    ) {
        return recruitmentService.sendMessage(
                principal.getUser(),
                id,
                request == null ? null : request.body(),
                request == null ? null : request.uploadId()
        );
    }

    @PostMapping("/{id}/report")
    public Map<String, String> report(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody ReportRecruitmentRequest request
    ) {
        recruitmentService.report(principal.getUser(), id, request.reason());
        return Map.of("status", "ok");
    }

    @PostMapping(path = "/{id}/messages/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileRef uploadMessageFile(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) {
        return recruitmentService.uploadMessageFile(principal.getUser(), id, file);
    }

    @GetMapping("/{id}/messages/{messageId}/file")
    public ResponseEntity<Resource> messageFile(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID messageId
    ) {
        UploadService.LoadedUpload loaded = recruitmentService.messageFile(principal.getUser(), id, messageId);
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

    @GetMapping("/{id}/cover-letter")
    public ResponseEntity<Resource> coverLetter(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        UploadService.LoadedUpload loaded = recruitmentService.coverLetterFile(principal.getUser(), id);
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
