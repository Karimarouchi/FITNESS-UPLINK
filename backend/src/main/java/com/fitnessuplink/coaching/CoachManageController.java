package com.fitnessuplink.coaching;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.coaching.dto.CoachingDtos.AvailabilityExceptionDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.AvailabilityRuleDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachAgendaSummaryDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachPackOfferDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachServiceDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachSettingsDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachingPackDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CreateAvailabilityExceptionRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.MemberInboxItemDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.UpdateCoachSettingsRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.UpsertAvailabilityRuleRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.UpsertCoachServiceRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.UpsertPackOfferRequest;
import lombok.RequiredArgsConstructor;
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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/coaching")
@RequiredArgsConstructor
public class CoachManageController {

    private final CoachServiceService coachServiceService;
    private final CoachAvailabilityService coachAvailabilityService;
    private final CoachingPackService coachingPackService;
    private final CoachingBookingService coachingBookingService;
    private final CoachSettingsService coachSettingsService;
    private final CoachDirectMessageService coachDirectMessageService;

    @GetMapping("/messages/mine")
    public List<MemberInboxItemDto> myMessageInbox(@AuthenticationPrincipal UserPrincipal principal) {
        return coachDirectMessageService.listMemberInbox(principal.getUser());
    }

    @GetMapping("/services")
    public List<CoachServiceDto> services(@AuthenticationPrincipal UserPrincipal principal) {
        return coachServiceService.list(principal.getUser());
    }

    @PostMapping("/services")
    public CoachServiceDto createService(@AuthenticationPrincipal UserPrincipal principal, @RequestBody UpsertCoachServiceRequest request) {
        return coachServiceService.create(principal.getUser(), request);
    }

    @PutMapping("/services/{id}")
    public CoachServiceDto updateService(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpsertCoachServiceRequest request
    ) {
        return coachServiceService.update(principal.getUser(), id, request);
    }

    @DeleteMapping("/services/{id}")
    public void deleteService(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        coachServiceService.delete(principal.getUser(), id);
    }

    @GetMapping("/availability/rules")
    public List<AvailabilityRuleDto> rules(@AuthenticationPrincipal UserPrincipal principal) {
        return coachAvailabilityService.rules(principal.getUser());
    }

    @PostMapping("/availability/rules")
    public AvailabilityRuleDto createRule(@AuthenticationPrincipal UserPrincipal principal, @RequestBody UpsertAvailabilityRuleRequest request) {
        return coachAvailabilityService.createRule(principal.getUser(), request);
    }

    @PutMapping("/availability/rules/{id}")
    public AvailabilityRuleDto updateRule(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpsertAvailabilityRuleRequest request
    ) {
        return coachAvailabilityService.updateRule(principal.getUser(), id, request);
    }

    @DeleteMapping("/availability/rules/{id}")
    public void deleteRule(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        coachAvailabilityService.deleteRule(principal.getUser(), id);
    }

    @GetMapping("/availability/exceptions")
    public List<AvailabilityExceptionDto> exceptions(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String from,
            @RequestParam String to
    ) {
        return coachAvailabilityService.exceptions(principal.getUser(), LocalDate.parse(from), LocalDate.parse(to));
    }

    @PostMapping("/availability/exceptions")
    public AvailabilityExceptionDto createException(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody CreateAvailabilityExceptionRequest request
    ) {
        return coachAvailabilityService.createException(principal.getUser(), request);
    }

    @DeleteMapping("/availability/exceptions/{id}")
    public void deleteException(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        coachAvailabilityService.deleteException(principal.getUser(), id);
    }

    @GetMapping("/pack-offers")
    public List<CoachPackOfferDto> myPackOffers(@AuthenticationPrincipal UserPrincipal principal) {
        return coachingPackService.myOffers(principal.getUser());
    }

    @PostMapping("/pack-offers")
    public CoachPackOfferDto createPackOffer(@AuthenticationPrincipal UserPrincipal principal, @RequestBody UpsertPackOfferRequest request) {
        return coachingPackService.createOffer(principal.getUser(), request);
    }

    @PutMapping("/pack-offers/{id}")
    public CoachPackOfferDto updatePackOffer(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpsertPackOfferRequest request
    ) {
        return coachingPackService.updateOffer(principal.getUser(), id, request);
    }

    @DeleteMapping("/pack-offers/{id}")
    public void deletePackOffer(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        coachingPackService.deleteOffer(principal.getUser(), id);
    }

    @GetMapping("/packs/sold")
    public List<CoachingPackDto> soldPacks(@AuthenticationPrincipal UserPrincipal principal) {
        return coachingPackService.soldPacks(principal.getUser());
    }

    @GetMapping("/agenda/summary")
    public CoachAgendaSummaryDto agendaSummary(@AuthenticationPrincipal UserPrincipal principal) {
        return coachingBookingService.agendaSummary(principal.getUser());
    }

    @GetMapping("/settings")
    public CoachSettingsDto settings(@AuthenticationPrincipal UserPrincipal principal) {
        return coachSettingsService.get(principal.getUser());
    }

    @PutMapping("/settings")
    public CoachSettingsDto updateSettings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateCoachSettingsRequest request
    ) {
        return coachSettingsService.update(principal.getUser(), request);
    }
}
