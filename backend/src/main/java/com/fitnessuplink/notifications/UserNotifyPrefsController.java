package com.fitnessuplink.notifications;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.notifications.dto.UpdateUserNotifyPrefsRequest;
import com.fitnessuplink.notifications.dto.UserNotifyPrefsDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/me/notify-prefs")
@RequiredArgsConstructor
public class UserNotifyPrefsController {

    private final UserNotifyPrefsService userNotifyPrefsService;

    @GetMapping
    public UserNotifyPrefsDto get(@AuthenticationPrincipal UserPrincipal principal) {
        return userNotifyPrefsService.get(principal.getUser());
    }

    @PutMapping
    public UserNotifyPrefsDto update(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateUserNotifyPrefsRequest request
    ) {
        return userNotifyPrefsService.update(principal.getUser(), request);
    }
}
