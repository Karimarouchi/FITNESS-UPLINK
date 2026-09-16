package com.fitnessuplink.coaching;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.coaching.dto.CoachingDtos.AdminCoachSummaryDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.BookingDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachingReportDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.PlatformSettingsDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.ResolveReportRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.UpdatePlatformSettingsRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/coaching")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PERM_admin.modules')")
public class AdminCoachingController {

    private final AdminCoachingService adminCoachingService;

    @GetMapping("/coaches")
    public List<AdminCoachSummaryDto> coaches(@AuthenticationPrincipal UserPrincipal principal) {
        return adminCoachingService.coaches(principal.getUser());
    }

    @GetMapping("/bookings")
    public List<BookingDto> bookings(@AuthenticationPrincipal UserPrincipal principal) {
        return adminCoachingService.bookings(principal.getUser());
    }

    @GetMapping("/reports")
    public List<CoachingReportDto> reports(@AuthenticationPrincipal UserPrincipal principal) {
        return adminCoachingService.reports(principal.getUser());
    }

    @PostMapping("/reports/{id}/resolve")
    public CoachingReportDto resolveReport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody(required = false) ResolveReportRequest request
    ) {
        return adminCoachingService.resolveReport(principal.getUser(), id, request);
    }

    @GetMapping("/settings")
    public PlatformSettingsDto settings(@AuthenticationPrincipal UserPrincipal principal) {
        return adminCoachingService.platformSettings(principal.getUser());
    }

    @PutMapping("/settings")
    public PlatformSettingsDto updateSettings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdatePlatformSettingsRequest request
    ) {
        return adminCoachingService.updatePlatformSettings(principal.getUser(), request);
    }
}
