package com.fitnessuplink.coaching;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachInboxItemDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.DirectMessageDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.SendDirectMessageRequest;
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
@RequestMapping("/v1/coaches/{coachId}/messages")
@RequiredArgsConstructor
public class CoachDirectMessageController {

    private final CoachDirectMessageService coachDirectMessageService;

    /** Member fetches their thread with a coach */
    @GetMapping
    public List<DirectMessageDto> thread(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID coachId
    ) {
        return coachDirectMessageService.thread(principal.getUser(), coachId);
    }

    /** Member sends a message to a coach */
    @PostMapping
    public DirectMessageDto send(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID coachId,
            @RequestBody SendDirectMessageRequest request
    ) {
        return coachDirectMessageService.send(principal.getUser(), coachId, request);
    }

    /** Coach gets inbox: list of members with their latest message */
    @GetMapping("/inbox")
    public List<CoachInboxItemDto> listInbox(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID coachId
    ) {
        return coachDirectMessageService.listInbox(principal.getUser());
    }

    /** Coach fetches thread with a specific member */
    @GetMapping("/member/{memberId}")
    public List<DirectMessageDto> coachInbox(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID coachId,
            @PathVariable UUID memberId
    ) {
        return coachDirectMessageService.coachInbox(principal.getUser(), memberId);
    }

    /** Coach replies to a member */
    @PostMapping("/member/{memberId}")
    public DirectMessageDto coachReply(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID coachId,
            @PathVariable UUID memberId,
            @RequestBody SendDirectMessageRequest request
    ) {
        return coachDirectMessageService.coachReply(principal.getUser(), memberId, request);
    }
}
