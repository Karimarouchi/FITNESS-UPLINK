package com.fitnessuplink.jobs;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.jobs.dto.JobOfferDto;
import com.fitnessuplink.jobs.dto.UpsertJobOfferRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/job-offers")
@RequiredArgsConstructor
public class JobOfferController {

    private final JobOfferService jobOfferService;

    @GetMapping
    public List<JobOfferDto> list(@AuthenticationPrincipal UserPrincipal principal) {
        return jobOfferService.list(principal.getUser());
    }

    @GetMapping("/{id}")
    public JobOfferDto get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return jobOfferService.get(principal.getUser(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JobOfferDto create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpsertJobOfferRequest request
    ) {
        return jobOfferService.create(principal.getUser(), request);
    }

    @PatchMapping("/{id}")
    public JobOfferDto update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpsertJobOfferRequest request
    ) {
        return jobOfferService.update(principal.getUser(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        jobOfferService.delete(principal.getUser(), id);
        return ResponseEntity.noContent().build();
    }
}
