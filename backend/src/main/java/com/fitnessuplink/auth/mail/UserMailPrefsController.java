package com.fitnessuplink.auth.mail;

import com.fitnessuplink.auth.mail.dto.UpdateUserMailPrefsRequest;
import com.fitnessuplink.auth.mail.dto.UserMailPrefsDto;
import com.fitnessuplink.auth.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/me/mail-prefs")
@RequiredArgsConstructor
public class UserMailPrefsController {

    private final UserMailPrefsService userMailPrefsService;

    @GetMapping
    public UserMailPrefsDto get(@AuthenticationPrincipal UserPrincipal principal) {
        return userMailPrefsService.get(principal.getUser());
    }

    @PutMapping
    public UserMailPrefsDto update(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateUserMailPrefsRequest request
    ) {
        return userMailPrefsService.update(principal.getUser(), request);
    }
}
