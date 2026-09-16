package com.fitnessuplink.coaching;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.coaching.dto.CoachingDtos.BookingDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CancelBookingRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.CreateBookingRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.DeclineBookingRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.PayBookingRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.ReportBookingRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.SubmitReviewRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/coaching/bookings")
@RequiredArgsConstructor
public class CoachingBookingController {

    private final CoachingBookingService coachingBookingService;
    private final CoachingReviewService coachingReviewService;
    private final CoachingReportService coachingReportService;

    @PostMapping
    public BookingDto book(@AuthenticationPrincipal UserPrincipal principal, @RequestBody CreateBookingRequest request) {
        return coachingBookingService.book(principal.getUser(), request);
    }

    @GetMapping("/mine")
    public List<BookingDto> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return coachingBookingService.myBookings(principal.getUser());
    }

    @GetMapping("/coach")
    public List<BookingDto> coachBookings(@AuthenticationPrincipal UserPrincipal principal) {
        return coachingBookingService.coachBookings(principal.getUser());
    }

    @GetMapping("/{id}")
    public BookingDto get(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return coachingBookingService.get(principal.getUser(), id);
    }

    @PostMapping("/{id}/pay")
    public BookingDto pay(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody PayBookingRequest request
    ) {
        return coachingBookingService.pay(principal.getUser(), id, request);
    }

    @PostMapping("/{id}/confirm")
    public BookingDto confirm(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return coachingBookingService.confirmBooking(principal.getUser(), id);
    }

    @PostMapping("/{id}/decline")
    public BookingDto decline(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody(required = false) DeclineBookingRequest request
    ) {
        return coachingBookingService.declineBooking(principal.getUser(), id, request);
    }

    @PostMapping("/{id}/cancel")
    public BookingDto cancel(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody(required = false) CancelBookingRequest request
    ) {
        return coachingBookingService.cancel(principal.getUser(), id, request);
    }

    @PostMapping("/{id}/review")
    public void review(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody SubmitReviewRequest request
    ) {
        coachingReviewService.submit(principal.getUser(), id, request);
    }

    @PostMapping("/{id}/report")
    public void report(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody ReportBookingRequest request
    ) {
        coachingReportService.report(principal.getUser(), id, request);
    }
}
