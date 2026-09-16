package com.fitnessuplink.onboarding;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.onboarding.cv.CvImportService;
import com.fitnessuplink.onboarding.dto.CompleteProfileRequest;
import com.fitnessuplink.onboarding.dto.ParseCvRequest;
import com.fitnessuplink.onboarding.dto.ParseCvResponse;
import com.fitnessuplink.onboarding.dto.ProfileFieldResponse;
import com.fitnessuplink.onboarding.dto.ProfileValuesResponse;
import com.fitnessuplink.onboarding.dto.SelectCountryRequest;
import com.fitnessuplink.onboarding.dto.SelectIntentRequest;
import com.fitnessuplink.onboarding.dto.SelectPlanRequest;
import com.fitnessuplink.onboarding.dto.SelectRoleRequest;
import com.fitnessuplink.onboarding.dto.UploadResponse;
import com.fitnessuplink.user.dto.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
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

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/onboarding")
@RequiredArgsConstructor
public class OnboardingController {

    private final OnboardingService onboardingService;
    private final UploadService uploadService;
    private final CvImportService cvImportService;

    @PostMapping("/role")
    public UserResponse selectRole(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SelectRoleRequest request
    ) {
        return onboardingService.selectRole(principal.getId(), request);
    }

    @PostMapping("/intent")
    public UserResponse selectIntent(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SelectIntentRequest request
    ) {
        return onboardingService.selectIntent(principal.getId(), request);
    }

    @PostMapping("/country")
    public UserResponse selectCountry(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SelectCountryRequest request
    ) {
        return onboardingService.selectCountry(principal.getId(), request);
    }

    @GetMapping("/profile-fields")
    public List<ProfileFieldResponse> profileFields(@AuthenticationPrincipal UserPrincipal principal) {
        return onboardingService.profileFields(principal.getId());
    }

    @GetMapping("/profile")
    public ProfileValuesResponse profileValues(@AuthenticationPrincipal UserPrincipal principal) {
        return onboardingService.profileValues(principal.getId());
    }

    @PostMapping("/profile")
    public UserResponse completeProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CompleteProfileRequest request
    ) {
        return onboardingService.completeProfile(principal.getId(), request);
    }

    @PostMapping("/plan")
    public UserResponse selectPlan(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SelectPlanRequest request
    ) {
        return onboardingService.selectPlan(principal.getId(), request);
    }

    @PostMapping("/payment")
    public UserResponse confirmPayment(@AuthenticationPrincipal UserPrincipal principal) {
        return onboardingService.confirmPayment(principal.getId());
    }

    @PostMapping("/profile/parse-cv")
    public ParseCvResponse parseCv(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ParseCvRequest request
    ) {
        return cvImportService.parse(principal.getId(), request.uploadId());
    }

    @PostMapping(path = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResponse upload(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String fieldKey,
            @RequestParam MultipartFile file
    ) {
        return uploadService.store(principal.getId(), fieldKey, file);
    }

    @GetMapping("/uploads/{id}")
    public ResponseEntity<Resource> download(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        UploadService.LoadedUpload loaded = principal.getUser().isSuperAdmin()
                ? uploadService.loadAny(id)
                : uploadService.load(principal.getId(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.upload().getContentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline()
                                .filename(loaded.upload().getOriginalFilename(), StandardCharsets.UTF_8)
                                .build()
                                .toString()
                )
                .body(loaded.resource());
    }
}
