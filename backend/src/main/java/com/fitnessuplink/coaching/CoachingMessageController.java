package com.fitnessuplink.coaching;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.coaching.dto.CoachingDtos.MessageDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.SendMessageRequest;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/coaching/bookings/{bookingId}/messages")
@RequiredArgsConstructor
public class CoachingMessageController {

    private final CoachingMessageService coachingMessageService;

    @GetMapping
    public List<MessageDto> thread(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID bookingId) {
        return coachingMessageService.thread(principal.getUser(), bookingId);
    }

    @PostMapping
    public MessageDto send(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID bookingId,
            @RequestBody SendMessageRequest request
    ) {
        return coachingMessageService.send(principal.getUser(), bookingId, request);
    }

    @PostMapping("/attachments")
    public Map<String, UUID> uploadAttachment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID bookingId,
            @RequestParam("file") MultipartFile file
    ) {
        return Map.of("uploadId", coachingMessageService.uploadAttachment(principal.getUser(), bookingId, file));
    }

    @GetMapping("/{messageId}/file")
    public ResponseEntity<Resource> attachment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID bookingId,
            @PathVariable UUID messageId
    ) {
        UploadService.LoadedUpload loaded = coachingMessageService.attachment(principal.getUser(), bookingId, messageId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.upload().getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + loaded.upload().getOriginalFilename() + "\"")
                .body(loaded.resource());
    }
}
