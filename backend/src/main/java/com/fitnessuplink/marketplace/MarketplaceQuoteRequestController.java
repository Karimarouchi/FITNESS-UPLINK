package com.fitnessuplink.marketplace;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ConfirmQuoteRequest;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.CreateQuoteRequest;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.QuoteRequestStatusDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ReceivedQuoteRequestDto;
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
@RequestMapping("/v1/marketplace")
@RequiredArgsConstructor
public class MarketplaceQuoteRequestController {

    private final MarketplaceQuoteRequestService marketplaceQuoteRequestService;

    @PostMapping("/products/{id}/quote-requests")
    public QuoteRequestStatusDto create(@PathVariable UUID id, @RequestBody CreateQuoteRequest request) {
        return marketplaceQuoteRequestService.create(id, request);
    }

    @PostMapping("/quote-requests/{id}/confirm")
    public QuoteRequestStatusDto confirm(@PathVariable UUID id, @RequestBody ConfirmQuoteRequest request) {
        return marketplaceQuoteRequestService.confirm(id, request);
    }

    @PostMapping("/quote-requests/{id}/resend")
    public void resend(@PathVariable UUID id) {
        marketplaceQuoteRequestService.resend(id);
    }

    @GetMapping("/quote-requests/received")
    public List<ReceivedQuoteRequestDto> received(@AuthenticationPrincipal UserPrincipal principal) {
        return marketplaceQuoteRequestService.received(principal.getUser());
    }

    @PostMapping("/quote-requests/{id}/handle")
    public ReceivedQuoteRequestDto handle(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return marketplaceQuoteRequestService.markHandled(principal.getUser(), id);
    }
}
