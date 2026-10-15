package com.fitnessuplink.talent;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.talent.NegotiationService.OfferDto;
import com.fitnessuplink.talent.NegotiationService.OfferRequest;
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
@RequestMapping("/v1/recruitments/{id}/negotiation")
@RequiredArgsConstructor
public class NegotiationController {

    private final NegotiationService negotiationService;

    @GetMapping
    public List<OfferDto> list(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return negotiationService.list(principal.getUser(), id);
    }

    @PostMapping
    public OfferDto propose(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody OfferRequest request
    ) {
        return negotiationService.propose(principal.getUser(), id, request);
    }

    @PostMapping("/{offerId}/accept")
    public OfferDto accept(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id, @PathVariable UUID offerId) {
        return negotiationService.respond(principal.getUser(), id, offerId, true);
    }

    @PostMapping("/{offerId}/decline")
    public OfferDto decline(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id, @PathVariable UUID offerId) {
        return negotiationService.respond(principal.getUser(), id, offerId, false);
    }
}
