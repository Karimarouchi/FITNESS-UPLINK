package com.fitnessuplink.auth.mail;

import com.fitnessuplink.auth.mail.dto.MailEventPageDto;
import com.fitnessuplink.auth.mail.dto.MailSettingsDto;
import com.fitnessuplink.auth.mail.dto.MailTemplateDto;
import com.fitnessuplink.auth.mail.dto.UpdateMailSettingsRequest;
import com.fitnessuplink.auth.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/mail")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PERM_admin.config')")
public class MailAdminController {

    private final MailSettingsService mailSettingsService;
    private final MailEventService mailEventService;
    private final MailService mailService;
    private final UserMailPrefsService userMailPrefsService;

    @GetMapping("/settings")
    public MailSettingsDto settings() {
        return mailSettingsService.toDto();
    }

    @PutMapping("/settings")
    public MailSettingsDto updateSettings(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateMailSettingsRequest request
    ) {
        return mailSettingsService.update(request, principal.getId());
    }

    @GetMapping("/events")
    public MailEventPageDto events(
            @RequestParam(required = false) MailEventStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return mailEventService.list(status, page, size);
    }

    @PostMapping("/test")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void test(@AuthenticationPrincipal UserPrincipal principal) {
        mailService.sendTest(principal.getUsername());
    }

    @GetMapping("/templates")
    public List<MailTemplateDto> templates() {
        return userMailPrefsService.templates();
    }

    @PutMapping("/templates")
    public MailTemplateDto saveTemplate(@Valid @RequestBody MailTemplateDto request) {
        return userMailPrefsService.saveTemplate(request);
    }
}
