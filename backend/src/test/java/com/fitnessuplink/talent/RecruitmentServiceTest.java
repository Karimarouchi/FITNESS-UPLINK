package com.fitnessuplink.talent;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.contracts.ContractRepository;
import com.fitnessuplink.jobs.JobOffer;
import com.fitnessuplink.jobs.JobOfferRepository;
import com.fitnessuplink.jobs.JobOfferService;
import com.fitnessuplink.jobs.dto.JobOfferSummaryDto;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.talent.dto.CreateRecruitmentRequest;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.talent.dto.RecruitmentDto;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecruitmentServiceTest {

    @Mock
    private TalentPipelineRepository talentPipelineRepository;
    @Mock
    private JobOfferRepository jobOfferRepository;
    @Mock
    private JobOfferService jobOfferService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserProfileValueRepository userProfileValueRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private PermissionService permissionService;
    @Mock
    private com.fitnessuplink.onboarding.UploadService uploadService;
    @Mock
    private com.fitnessuplink.talent.RecruitmentMessageRepository recruitmentMessageRepository;
    @Mock
    private com.fitnessuplink.notifications.NotificationService notificationService;
    @Mock
    private com.fitnessuplink.auth.mail.HireMailService hireMailService;
    @Mock
    private HireReportRepository hireReportRepository;
    @Mock
    private HireAbuseGuard hireAbuseGuard;
    @Mock
    private com.fitnessuplink.billing.EntitlementService entitlementService;

    @InjectMocks
    private RecruitmentService recruitmentService;

    private UUID employerId;
    private UUID candidateId;
    private UUID offerId;
    private User employer;
    private User candidate;
    private User otherEmployer;
    private User fitnessPro;
    private JobOffer offer;

    @BeforeEach
    void setUp() {
        employerId = UUID.randomUUID();
        candidateId = UUID.randomUUID();
        offerId = UUID.randomUUID();
        employer = user(employerId, "EMPLOYER", "BUSINESS", true);
        candidate = user(candidateId, "CANDIDATE", "TALENT", true);
        otherEmployer = user(UUID.randomUUID(), "EMPLOYER", "BUSINESS", true);
        fitnessPro = user(UUID.randomUUID(), "CANDIDATE", "TALENT", true);
        lenient().when(permissionService.has(any(User.class), anyString())).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            String code = invocation.getArgument(1);
            if (user == null || code == null) {
                return false;
            }
            if (user.isCandidate()) {
                return code.equals(Permissions.HIRE_APPLICATIONS_VIEW)
                        || code.equals(Permissions.HIRE_JOBS_APPLY)
                        || code.equals(Permissions.HIRE_CONTRACTS_CANDIDATE);
            }
            if (user.isBusiness()) {
                return code.equals(Permissions.HIRE_PIPELINE)
                        || code.equals(Permissions.HIRE_JOBS_MANAGE)
                        || code.equals(Permissions.HIRE_CANDIDATES_SEARCH)
                        || code.equals(Permissions.HIRE_FAVORITES)
                        || code.equals(Permissions.HIRE_CONTRACTS_EMPLOYER);
            }
            return false;
        });
        lenient().doAnswer(invocation -> {
            User user = invocation.getArgument(0);
            String code = invocation.getArgument(1);
            if (user == null || !user.isOnboardingCompleted() || !permissionService.has(user, code)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
            }
            return null;
        }).when(permissionService).require(any(User.class), anyString());
        offer = JobOffer.builder()
                .id(offerId)
                .employerId(employerId)
                .title("Personal Trainer — Dubai")
                .position("Personal Trainer")
                .location("Dubai")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void employerCanStartDirectRecruitment() {
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(talentPipelineRepository.existsByEmployerIdAndCandidateIdAndJobOfferIdIsNull(employerId, candidateId)).thenReturn(false);
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());
        when(talentPipelineRepository.saveAndFlush(any(TalentPipeline.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RecruitmentDto dto = recruitmentService.create(employer, new CreateRecruitmentRequest(candidateId, null, "Profil solide"));

        assertEquals(PipelineStatus.NEW, dto.status());
        assertTrue(dto.directRecruitment());
        assertNull(dto.jobOffer());
        assertEquals("Profil solide", dto.internalNote());
        assertEquals(candidateId, dto.candidate().id());
        ArgumentCaptor<TalentPipeline> captor = ArgumentCaptor.forClass(TalentPipeline.class);
        verify(talentPipelineRepository).saveAndFlush(captor.capture());
        assertEquals(employerId, captor.getValue().getEmployerId());
        assertNull(captor.getValue().getJobOfferId());
    }

    @Test
    void employerCanStartRecruitmentLinkedToOwnOffer() {
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(jobOfferService.requireOwned(employerId, offerId)).thenReturn(offer);
        when(jobOfferService.toSummary(offer)).thenReturn(new JobOfferSummaryDto(offerId, offer.getTitle(), offer.getPosition(), offer.getLocation()));
        when(jobOfferRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(talentPipelineRepository.existsByEmployerIdAndCandidateIdAndJobOfferId(employerId, candidateId, offerId)).thenReturn(false);
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());
        when(talentPipelineRepository.saveAndFlush(any(TalentPipeline.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RecruitmentDto dto = recruitmentService.create(employer, new CreateRecruitmentRequest(candidateId, offerId, null));

        assertFalse(dto.directRecruitment());
        assertEquals(offerId, dto.jobOffer().id());
        assertEquals(PipelineStatus.NEW, dto.status());
    }

    @Test
    void missingCandidateReturnsNotFound() {
        when(userRepository.findById(candidateId)).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> recruitmentService.create(employer, new CreateRecruitmentRequest(candidateId, null, null)));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        assertEquals("CANDIDATE_NOT_FOUND", error.getMessage());
        verify(talentPipelineRepository, never()).saveAndFlush(any());
    }

    @Test
    void offerOwnedByAnotherEmployerIsRejected() {
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(jobOfferService.requireOwned(employerId, offerId))
                .thenThrow(new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND"));

        ApiException error = assertThrows(ApiException.class,
                () -> recruitmentService.create(employer, new CreateRecruitmentRequest(candidateId, offerId, null)));
        assertEquals("JOB_OFFER_NOT_FOUND", error.getMessage());
    }

    @Test
    void duplicateDirectRecruitmentIsRejected() {
        when(userRepository.findById(candidateId)).thenReturn(Optional.empty());
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(talentPipelineRepository.existsByEmployerIdAndCandidateIdAndJobOfferIdIsNull(employerId, candidateId)).thenReturn(true);

        ApiException error = assertThrows(ApiException.class,
                () -> recruitmentService.create(employer, new CreateRecruitmentRequest(candidateId, null, null)));
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("RECRUITMENT_ALREADY_EXISTS", error.getMessage());
    }

    @Test
    void duplicateOfferRecruitmentIsRejected() {
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(jobOfferService.requireOwned(employerId, offerId)).thenReturn(offer);
        when(talentPipelineRepository.existsByEmployerIdAndCandidateIdAndJobOfferId(employerId, candidateId, offerId)).thenReturn(true);

        ApiException error = assertThrows(ApiException.class,
                () -> recruitmentService.create(employer, new CreateRecruitmentRequest(candidateId, offerId, null)));
        assertEquals("RECRUITMENT_ALREADY_EXISTS", error.getMessage());
    }

    @Test
    void uniqueConstraintRaceBecomesAlreadyExists() {
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(talentPipelineRepository.existsByEmployerIdAndCandidateIdAndJobOfferIdIsNull(employerId, candidateId)).thenReturn(false);
        when(talentPipelineRepository.saveAndFlush(any(TalentPipeline.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate"));

        ApiException error = assertThrows(ApiException.class,
                () -> recruitmentService.create(employer, new CreateRecruitmentRequest(candidateId, null, null)));
        assertEquals("RECRUITMENT_ALREADY_EXISTS", error.getMessage());
    }

    @Test
    void statusChangeUpdatesOwnedEntry() {
        TalentPipeline entry = entry(PipelineStatus.NEW, null);
        when(talentPipelineRepository.findByIdAndEmployerId(entry.getId(), employerId)).thenReturn(Optional.of(entry));
        when(talentPipelineRepository.save(entry)).thenReturn(entry);
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());

        RecruitmentDto dto = recruitmentService.updateStatus(employer, entry.getId(), PipelineStatus.CONTACTED);

        assertEquals(PipelineStatus.CONTACTED, dto.status());
        assertEquals(PipelineStatus.CONTACTED, entry.getStatus());
        verify(notificationService).notify(
                eq(candidateId),
                eq(NotifyCategory.CONTACT),
                eq("Vous êtes contacté"),
                anyString(),
                eq("Ouvrir"),
                eq("/app/applications")
        );
    }

    @Test
    void directContractSentStatusIsRejected() {
        ApiException error = assertThrows(ApiException.class,
                () -> recruitmentService.updateStatus(employer, UUID.randomUUID(), PipelineStatus.CONTRACT_SENT));
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("CONTRACT_REQUIRED", error.getMessage());
        verify(talentPipelineRepository, never()).save(any());
    }

    @Test
    void hiredWithoutCompletedContractIsRejected() {
        TalentPipeline entry = entry(PipelineStatus.CONTRACT_SENT, null);
        when(talentPipelineRepository.findByIdAndEmployerId(entry.getId(), employerId)).thenReturn(Optional.of(entry));
        when(contractRepository.existsByRecruitmentIdAndStatus(entry.getId(), com.fitnessuplink.contracts.ContractStatus.COMPLETED)).thenReturn(false);

        ApiException error = assertThrows(ApiException.class,
                () -> recruitmentService.updateStatus(employer, entry.getId(), PipelineStatus.HIRED));
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("CONTRACT_NOT_COMPLETED", error.getMessage());
    }

    @Test
    void hiredAfterCompletedContractIsAllowed() {
        TalentPipeline entry = entry(PipelineStatus.CONTRACT_SENT, null);
        when(talentPipelineRepository.findByIdAndEmployerId(entry.getId(), employerId)).thenReturn(Optional.of(entry));
        when(contractRepository.existsByRecruitmentIdAndStatus(entry.getId(), com.fitnessuplink.contracts.ContractStatus.COMPLETED)).thenReturn(true);
        when(talentPipelineRepository.save(entry)).thenReturn(entry);
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());
        when(contractRepository.findByRecruitmentIdOrderByCreatedAtDesc(entry.getId())).thenReturn(List.of());

        RecruitmentDto dto = recruitmentService.updateStatus(employer, entry.getId(), PipelineStatus.HIRED);
        assertEquals(PipelineStatus.HIRED, dto.status());
    }

    @Test
    void employerCannotReadAnotherEmployerPipeline() {
        UUID foreignId = UUID.randomUUID();
        when(talentPipelineRepository.findByIdAndEmployerId(foreignId, otherEmployer.getId())).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class, () -> recruitmentService.get(otherEmployer, foreignId));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        assertEquals("RECRUITMENT_NOT_FOUND", error.getMessage());
    }

    @Test
    void candidateCannotStartRecruitment() {
        ApiException error = assertThrows(ApiException.class,
                () -> recruitmentService.create(fitnessPro, new CreateRecruitmentRequest(candidateId, null, null)));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals("FORBIDDEN", error.getMessage());
    }

    @Test
    void listReturnsOnlyEmployerEntriesAndMapsDto() {
        TalentPipeline row = entry(PipelineStatus.NEGOTIATION, null);
        when(talentPipelineRepository.findByEmployerIdOrderByUpdatedAtDesc(employerId)).thenReturn(List.of(row));
        when(userRepository.findAllById(anyCollection())).thenReturn(List.of(candidate));
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());
        when(jobOfferRepository.findAllById(anyCollection())).thenReturn(List.of());

        List<RecruitmentDto> list = recruitmentService.list(employer, null, true, null, null);

        assertEquals(1, list.size());
        assertEquals(candidate.getDisplayName(), list.getFirst().candidate().displayName());
        assertEquals("Note privée", list.getFirst().internalNote());
        assertTrue(list.getFirst().directRecruitment());
    }

    @Test
    void candidateListHidesEmployerNotes() {
        TalentPipeline row = entry(PipelineStatus.INTERVIEW_SCHEDULED, null);
        when(talentPipelineRepository.findByCandidateIdOrderByUpdatedAtDesc(candidateId)).thenReturn(List.of(row));
        when(userRepository.findAllById(anyCollection())).thenReturn(List.of(candidate, employer));
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());
        when(jobOfferRepository.findAllById(anyCollection())).thenReturn(List.of());

        List<RecruitmentDto> list = recruitmentService.list(candidate, null, null, null, null);

        assertEquals(1, list.size());
        assertNull(list.getFirst().internalNote());
        assertEquals(employer.getDisplayName(), list.getFirst().employer().displayName());
    }

    @Test
    void candidateCanApplyToPublishedOffer() {
        offer.setStatus(com.fitnessuplink.jobs.JobOfferStatus.PUBLISHED);
        when(jobOfferRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(userRepository.findById(employerId)).thenReturn(Optional.of(employer));
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(talentPipelineRepository.existsByEmployerIdAndCandidateIdAndJobOfferId(employerId, candidateId, offerId)).thenReturn(false);
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());
        when(jobOfferService.toSummary(offer)).thenReturn(new JobOfferSummaryDto(offerId, offer.getTitle(), offer.getPosition(), offer.getLocation()));
        when(talentPipelineRepository.saveAndFlush(any(TalentPipeline.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RecruitmentDto dto = recruitmentService.apply(candidate, offerId, null);

        assertEquals(PipelineStatus.APPLIED, dto.status());
        assertNull(dto.internalNote());
        assertEquals(offerId, dto.jobOffer().id());
        ArgumentCaptor<TalentPipeline> captor = ArgumentCaptor.forClass(TalentPipeline.class);
        verify(talentPipelineRepository).saveAndFlush(captor.capture());
        assertEquals(PipelineStatus.APPLIED, captor.getValue().getStatus());
    }

    @Test
    void employerCanAcceptAppliedIntoPipeline() {
        TalentPipeline entry = entry(PipelineStatus.APPLIED, offerId);
        when(talentPipelineRepository.findByIdAndEmployerId(entry.getId(), employerId)).thenReturn(Optional.of(entry));
        when(talentPipelineRepository.save(entry)).thenReturn(entry);
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());
        when(jobOfferRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(jobOfferService.toSummary(offer)).thenReturn(new JobOfferSummaryDto(offerId, offer.getTitle(), offer.getPosition(), offer.getLocation()));

        RecruitmentDto dto = recruitmentService.updateStatus(employer, entry.getId(), PipelineStatus.CONTACTED);

        assertEquals(PipelineStatus.CONTACTED, dto.status());
        verify(notificationService).notify(
                eq(candidateId),
                eq(NotifyCategory.CONTACT),
                eq("Vous êtes contacté"),
                anyString(),
                eq("Ouvrir"),
                eq("/app/applications")
        );
    }

    @Test
    void employerCanRejectAppliedFromInbox() {
        TalentPipeline entry = entry(PipelineStatus.APPLIED, offerId);
        when(talentPipelineRepository.findByIdAndEmployerId(entry.getId(), employerId)).thenReturn(Optional.of(entry));
        when(talentPipelineRepository.save(entry)).thenReturn(entry);
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());
        when(jobOfferRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(jobOfferService.toSummary(offer)).thenReturn(new JobOfferSummaryDto(offerId, offer.getTitle(), offer.getPosition(), offer.getLocation()));

        RecruitmentDto dto = recruitmentService.updateStatus(employer, entry.getId(), PipelineStatus.REJECTED);

        assertEquals(PipelineStatus.REJECTED, dto.status());
    }

    @Test
    void archiveSetsArchivedStatus() {
        TalentPipeline entry = entry(PipelineStatus.CONTACTED, null);
        when(talentPipelineRepository.findByIdAndEmployerId(entry.getId(), employerId)).thenReturn(Optional.of(entry));
        when(talentPipelineRepository.save(entry)).thenReturn(entry);
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());

        RecruitmentDto dto = recruitmentService.archive(employer, entry.getId());
        assertEquals(PipelineStatus.ARCHIVED, dto.status());
    }

    @Test
    void noteUpdateReturnsDtoNotEntity() {
        TalentPipeline entry = entry(PipelineStatus.NEW, null);
        when(talentPipelineRepository.findByIdAndEmployerId(entry.getId(), employerId)).thenReturn(Optional.of(entry));
        when(talentPipelineRepository.save(entry)).thenReturn(entry);
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserIdIn(anyCollection())).thenReturn(List.of());

        RecruitmentDto dto = recruitmentService.updateNote(employer, entry.getId(), "Demander disponibilité");
        assertInstanceOf(RecruitmentDto.class, dto);
        assertEquals("Demander disponibilité", dto.internalNote());
    }

    private TalentPipeline entry(PipelineStatus status, UUID jobOffer) {
        Instant now = Instant.now();
        return TalentPipeline.builder()
                .id(UUID.randomUUID())
                .employerId(employerId)
                .candidateId(candidateId)
                .jobOfferId(jobOffer)
                .status(status)
                .internalNote("Note privée")
                .createdAt(now)
                .updatedAt(now)
                .statusUpdatedAt(now)
                .build();
    }

    private User user(UUID id, String code, String category, boolean onboarded) {
        AppRole role = new AppRole();
        role.setCode(code);
        role.setCategory(category);
        User user = User.builder()
                .id(id)
                .email(id + "@test.com")
                .passwordHash("hash")
                .firstName("Sarah")
                .lastName("Ben Ali")
                .displayName("Sarah Ben Ali")
                .onboardingCompleted(onboarded)
                .build();
        user.setAppRole(role);
        return user;
    }
}
