package com.fitnessuplink.jobs;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.jobs.dto.OpportunityDto;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.onboarding.dto.UploadResponse;
import com.fitnessuplink.talent.RecruitmentService;
import com.fitnessuplink.talent.dto.ApplyOpportunityRequest;
import com.fitnessuplink.talent.dto.RecruitmentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
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
import java.util.UUID;

@RestController
@RequestMapping("/v1/opportunities")
@RequiredArgsConstructor
public class OpportunityController {

    private final OpportunityService opportunityService;
    private final RecruitmentService recruitmentService;
    private final UploadService uploadService;

    @GetMapping
    public List<OpportunityDto> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String q
    ) {
        return opportunityService.listPublished(principal.getUser(), q);
    }

    @GetMapping("/{id}")
    public OpportunityDto get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return opportunityService.getPublished(principal.getUser(), id);
    }

    @PostMapping(path = "/cover-letter", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResponse uploadCoverLetter(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam MultipartFile file
    ) {
        var upload = uploadService.storePdf(principal.getId(), "cover_letter", file);
        return new UploadResponse(
                upload.getId(),
                upload.getFieldKey(),
                upload.getOriginalFilename(),
                upload.getContentType(),
                upload.getSizeBytes()
        );
    }

    @PostMapping("/{id}/apply")
    public RecruitmentDto apply(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody(required = false) ApplyOpportunityRequest request
    ) {
        return recruitmentService.apply(principal.getUser(), id, request);
    }
}
