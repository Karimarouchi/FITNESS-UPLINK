package com.fitnessuplink.talent;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.talent.dto.CandidateCardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final CandidateService candidateService;

    @GetMapping
    public List<CandidateCardResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        return candidateService.listFavorites(principal.getUser());
    }
}
