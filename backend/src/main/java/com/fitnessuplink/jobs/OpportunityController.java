package com.fitnessuplink.jobs;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.jobs.dto.OpportunityDto;
import com.fitnessuplink.talent.RecruitmentService;
import com.fitnessuplink.talent.dto.RecruitmentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/opportunities")
@RequiredArgsConstructor
public class OpportunityController {

    private final OpportunityService opportunityService;
    private final RecruitmentService recruitmentService;

    @GetMapping
    public List<OpportunityDto> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String q
    ) {
        return opportunityService.listPublished(principal.getUser(), q);
    }

    @PostMapping("/{id}/apply")
    public RecruitmentDto apply(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return recruitmentService.apply(principal.getUser(), id);
    }
}
