package com.fitnessuplink.academy;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.academy.dto.AcademyDtos.PayRegistrationRequest;
import com.fitnessuplink.academy.dto.AcademyDtos.RegistrationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/academy/registrations")
@RequiredArgsConstructor
public class FormationRegistrationController {

    private final FormationRegistrationService formationRegistrationService;

    @PostMapping
    public RegistrationDto register(@AuthenticationPrincipal UserPrincipal principal, @RequestParam UUID sessionId) {
        return formationRegistrationService.register(principal.getUser(), sessionId);
    }

    @GetMapping("/mine")
    public List<RegistrationDto> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return formationRegistrationService.mine(principal.getUser());
    }

    @GetMapping("/{id}")
    public RegistrationDto get(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return formationRegistrationService.get(principal.getUser(), id);
    }

    @PostMapping("/{id}/pay")
    public RegistrationDto pay(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody PayRegistrationRequest request
    ) {
        return formationRegistrationService.pay(principal.getUser(), id, request);
    }

    @PostMapping("/{id}/cancel")
    public RegistrationDto cancel(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return formationRegistrationService.cancel(principal.getUser(), id);
    }
}
