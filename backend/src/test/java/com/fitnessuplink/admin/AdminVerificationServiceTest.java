package com.fitnessuplink.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.admin.dto.VerificationDossierDto;
import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.UserService;
import com.fitnessuplink.user.dto.OnboardingStep;
import com.fitnessuplink.user.dto.UserResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminVerificationServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserProfileValueRepository userProfileValueRepository;
    @Mock
    private UserService userService;
    @Mock
    private UserVerificationCheckRepository userVerificationCheckRepository;

    private AdminVerificationService service;
    private final List<UserVerificationCheck> storedChecks = new ArrayList<>();

    @BeforeEach
    void setUp() {
        storedChecks.clear();
        service = new AdminVerificationService(
                userRepository,
                userProfileValueRepository,
                userService,
                userVerificationCheckRepository,
                new ObjectMapper()
        );
        lenient().when(userVerificationCheckRepository.findByUserId(any())).thenAnswer(invocation -> List.copyOf(storedChecks));
        lenient().when(userVerificationCheckRepository.findById(any())).thenAnswer(invocation -> {
            UserVerificationCheckId id = invocation.getArgument(0);
            return storedChecks.stream()
                    .filter(item -> item.getUserId().equals(id.getUserId()) && item.getCheckKey().equals(id.getCheckKey()))
                    .findFirst();
        });
        lenient().when(userVerificationCheckRepository.save(any())).thenAnswer(invocation -> {
            UserVerificationCheck check = invocation.getArgument(0);
            storedChecks.removeIf(item ->
                    item.getUserId().equals(check.getUserId()) && item.getCheckKey().equals(check.getCheckKey()));
            storedChecks.add(check);
            return check;
        });
        lenient().when(userService.toResponse(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            return new UserResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getDisplayName(),
                    null,
                    null,
                    user.isOnboardingCompleted(),
                    OnboardingStep.DONE,
                    Instant.now(),
                    null,
                    user.getVerificationStatus()
            );
        });
        lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void candidateWithoutDiplomasIsVerifiedAfterIdentity() {
        User candidate = candidate();
        when(userRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserId(candidate.getId())).thenReturn(List.of(
                value(candidate.getId(), "professional_photo", fileJson())
        ));

        VerificationDossierDto dossier = service.updateCheck(candidate.getId(), "identity", "verified");

        assertEquals("verified", dossier.account().verificationStatus());
        assertEquals("verified", review(dossier, "identity"));
        assertEquals("pending", review(dossier, "diplomas"));
        assertEquals("pending", review(dossier, "certifications"));
    }

    @Test
    void candidateDiplomasMustBeValidatedWhenPresent() {
        User candidate = candidate();
        when(userRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserId(candidate.getId())).thenReturn(List.of(
                value(candidate.getId(), "professional_photo", fileJson()),
                value(candidate.getId(), "diplomas", fileJson())
        ));

        VerificationDossierDto afterIdentity = service.updateCheck(candidate.getId(), "identity", "verified");
        assertEquals("pending", afterIdentity.account().verificationStatus());

        VerificationDossierDto afterDiplomas = service.updateCheck(candidate.getId(), "diplomas", "verified");
        assertEquals("verified", afterDiplomas.account().verificationStatus());
        assertEquals("verified", review(afterDiplomas, "diplomas"));
    }

    @Test
    void cannotVerifyMissingCandidateDiplomas() {
        User candidate = candidate();
        when(userRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserId(candidate.getId())).thenReturn(List.of(
                value(candidate.getId(), "professional_photo", fileJson())
        ));

        ApiException error = assertThrows(
                ApiException.class,
                () -> service.updateCheck(candidate.getId(), "diplomas", "verified")
        );
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
    }

    @Test
    void candidateCertificationsMustBeValidatedWhenPresent() {
        User candidate = candidate();
        when(userRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserId(candidate.getId())).thenReturn(List.of(
                value(candidate.getId(), "professional_photo", fileJson()),
                value(candidate.getId(), "certifications", fileJson())
        ));

        service.updateCheck(candidate.getId(), "identity", "verified");
        assertEquals("pending", candidate.getVerificationStatus());

        VerificationDossierDto dossier = service.updateCheck(candidate.getId(), "certifications", "verified");
        assertEquals("verified", dossier.account().verificationStatus());
    }

    @Test
    void employerChecksAreIndependentAndAllRequired() {
        User employer = employer();
        when(userRepository.findById(employer.getId())).thenReturn(Optional.of(employer));
        when(userProfileValueRepository.findByUserId(employer.getId())).thenReturn(employerValues(employer.getId()));

        service.updateCheck(employer.getId(), "existence", "verified");
        assertEquals("pending", employer.getVerificationStatus());

        service.updateCheck(employer.getId(), "legal_documents", "verified");
        assertEquals("pending", employer.getVerificationStatus());

        VerificationDossierDto dossier = service.updateCheck(employer.getId(), "legal_representative", "verified");
        assertEquals("verified", dossier.account().verificationStatus());
        assertEquals("verified", review(dossier, "existence"));
        assertEquals("verified", review(dossier, "legal_documents"));
        assertEquals("verified", review(dossier, "legal_representative"));
    }

    @Test
    void rejectingOneEmployerCheckRejectsAccount() {
        User employer = employer();
        when(userRepository.findById(employer.getId())).thenReturn(Optional.of(employer));
        when(userProfileValueRepository.findByUserId(employer.getId())).thenReturn(employerValues(employer.getId()));

        service.updateCheck(employer.getId(), "existence", "verified");
        VerificationDossierDto dossier = service.updateCheck(employer.getId(), "legal_representative", "rejected");

        assertEquals("rejected", dossier.account().verificationStatus());
        assertEquals("verified", review(dossier, "existence"));
        assertEquals("rejected", review(dossier, "legal_representative"));
        assertEquals("pending", review(dossier, "legal_documents"));
    }

    @Test
    void unknownCheckKeyIsNotFound() {
        User candidate = candidate();
        when(userRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserId(candidate.getId())).thenReturn(List.of());

        ApiException error = assertThrows(
                ApiException.class,
                () -> service.updateCheck(candidate.getId(), "existence", "verified")
        );
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        assertTrue(storedChecks.isEmpty());
    }

    private String review(VerificationDossierDto dossier, String key) {
        return dossier.sections().stream()
                .filter(section -> section.key().equals(key))
                .findFirst()
                .orElseThrow()
                .reviewStatus();
    }

    private List<UserProfileValue> employerValues(UUID userId) {
        return List.of(
                value(userId, "legal_name", "Fitness Uplink"),
                value(userId, "tax_id", "ZEEEEEEEEEE"),
                value(userId, "legal_documents", fileJson()),
                value(userId, "legal_representative", "[{\"name\":\"Rihem DRIDI\",\"title\":\"Gérante\"}]")
        );
    }

    private UserProfileValue value(UUID userId, String key, String json) {
        return new UserProfileValue(userId, key, json);
    }

    private String fileJson() {
        return "[{\"id\":\"" + UUID.randomUUID() + "\",\"name\":\"piece.pdf\"}]";
    }

    private User candidate() {
        return user(UUID.randomUUID(), "CANDIDATE", "TALENT");
    }

    private User employer() {
        return user(UUID.randomUUID(), "EMPLOYER", "BUSINESS");
    }

    private User user(UUID id, String code, String category) {
        AppRole role = new AppRole();
        role.setCode(code);
        role.setCategory(category);
        User user = User.builder()
                .id(id)
                .email(id + "@test.com")
                .passwordHash("hash")
                .firstName("Karim")
                .lastName("Arctrr")
                .displayName("Karim Arctrr")
                .onboardingCompleted(true)
                .verificationStatus("pending")
                .build();
        user.setAppRole(role);
        return user;
    }
}
