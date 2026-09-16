package com.fitnessuplink.coaching;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.coaching.dto.CoachSearchQuery;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachPageDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachPackOfferDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachProfileDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.NextAvailableDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.TimeSlotDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.TopCoachDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.SubmitReviewRequest;
import com.fitnessuplink.onboarding.UploadService;
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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/coaches")
@RequiredArgsConstructor
public class CoachSearchController {

    private final CoachSearchService coachSearchService;
    private final CoachAvailabilityService coachAvailabilityService;
    private final CoachingPackService coachingPackService;
    private final CoachingReviewService coachingReviewService;

    @GetMapping("/top-rated")
    public List<TopCoachDto> topRated(@RequestParam(defaultValue = "6") int limit) {
        return coachSearchService.topRated(limit);
    }

    @GetMapping("/top-rated/{id}/files/{uploadId}")
    public ResponseEntity<Resource> topRatedPhoto(@PathVariable UUID id, @PathVariable UUID uploadId) {
        UploadService.LoadedUpload loaded = coachSearchService.publicPhoto(id, uploadId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.upload().getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + loaded.upload().getOriginalFilename() + "\"")
                .body(loaded.resource());
    }

    @GetMapping
    public CoachPageDto search(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID countryId,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        CoachSearchQuery query = CoachSearchQuery.of(q, countryId, city, specialty, sort, page, size);
        return coachSearchService.search(principal.getUser(), query);
    }

    @GetMapping("/{id}")
    public CoachProfileDto profile(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return coachSearchService.profile(principal.getUser(), id);
    }

    @PostMapping("/{id}/review")
    public void review(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody SubmitReviewRequest request
    ) {
        coachingReviewService.submitForCoach(principal.getUser(), id, request);
    }

    @GetMapping("/{id}/pack-offers")
    public List<CoachPackOfferDto> packOffers(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        coachSearchService.profile(principal.getUser(), id);
        return coachingPackService.offers(id);
    }

    @GetMapping("/{id}/availability")
    public List<TimeSlotDto> availability(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam UUID serviceId,
            @RequestParam String date
    ) {
        coachSearchService.profile(principal.getUser(), id);
        return coachAvailabilityService.slotsFor(id, serviceId, LocalDate.parse(date));
    }

    @GetMapping("/{id}/next-availability")
    public NextAvailableDto nextAvailable(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam UUID serviceId
    ) {
        coachSearchService.profile(principal.getUser(), id);
        LocalDate next = coachAvailabilityService.nextAvailableDate(id, serviceId, LocalDate.now(java.time.ZoneOffset.UTC));
        return new NextAvailableDto(next);
    }

    @GetMapping("/{id}/files/{uploadId}")
    public ResponseEntity<Resource> photo(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID uploadId
    ) {
        UploadService.LoadedUpload loaded = coachSearchService.photo(principal.getUser(), id, uploadId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.upload().getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + loaded.upload().getOriginalFilename() + "\"")
                .body(loaded.resource());
    }
}
