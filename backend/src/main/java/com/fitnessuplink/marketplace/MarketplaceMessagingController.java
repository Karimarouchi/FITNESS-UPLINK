package com.fitnessuplink.marketplace;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ConversationDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ConversationRefDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ConversationThreadDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.MarketplaceMessageDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.SendMarketplaceMessageRequest;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.UnreadCountDto;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
public class MarketplaceMessagingController {

    private final MarketplaceMessagingService messagingService;

    @PostMapping("/products/{productId}/conversations")
    public ConversationDto contact(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID productId,
            @RequestBody SendMarketplaceMessageRequest request
    ) {
        return messagingService.contactSupplier(requireUser(principal), productId, request);
    }

    @GetMapping("/products/{productId}/conversation")
    public ConversationRefDto existing(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID productId) {
        return messagingService.conversationFor(principal == null ? null : principal.getUser(), productId);
    }

    @GetMapping("/conversations")
    public List<ConversationDto> list(@AuthenticationPrincipal UserPrincipal principal) {
        return messagingService.list(requireUser(principal));
    }

    @GetMapping("/conversations/unread-count")
    public UnreadCountDto unread(@AuthenticationPrincipal UserPrincipal principal) {
        return messagingService.unreadCount(requireUser(principal));
    }

    @GetMapping("/conversations/{id}")
    public ConversationThreadDto thread(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return messagingService.thread(requireUser(principal), id);
    }

    @PostMapping("/conversations/{id}/messages")
    public MarketplaceMessageDto send(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody SendMarketplaceMessageRequest request
    ) {
        return messagingService.send(requireUser(principal), id, request);
    }

    private User requireUser(UserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }
        return principal.getUser();
    }
}
