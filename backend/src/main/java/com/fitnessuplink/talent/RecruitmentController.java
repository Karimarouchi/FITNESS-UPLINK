package com.fitnessuplink.talent;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.talent.dto.CreateRecruitmentRequest;
import com.fitnessuplink.talent.dto.RecruitmentDto;
import com.fitnessuplink.talent.dto.UpdateRecruitmentNoteRequest;
import com.fitnessuplink.talent.dto.UpdateRecruitmentStatusRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
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
        return recruitmentService.updateStatus(principal.getUser(), id, request.status());
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
}
