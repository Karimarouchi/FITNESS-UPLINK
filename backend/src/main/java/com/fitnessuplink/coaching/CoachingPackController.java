package com.fitnessuplink.coaching;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachingPackDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.PurchasePackRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/coaching/packs")
@RequiredArgsConstructor
public class CoachingPackController {

    private final CoachingPackService coachingPackService;

    @GetMapping("/mine")
    public List<CoachingPackDto> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return coachingPackService.myPacks(principal.getUser());
    }

    @PostMapping("/purchase")
    public CoachingPackDto purchase(@AuthenticationPrincipal UserPrincipal principal, @RequestBody PurchasePackRequest request) {
        return coachingPackService.purchase(principal.getUser(), request);
    }
}
