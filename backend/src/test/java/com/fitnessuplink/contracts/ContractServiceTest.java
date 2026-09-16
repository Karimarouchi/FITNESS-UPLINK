package com.fitnessuplink.contracts;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.contracts.dto.ContractDto;
import com.fitnessuplink.contracts.dto.ContractTermsDto;
import com.fitnessuplink.contracts.dto.CreateContractRequest;
import com.fitnessuplink.contracts.signature.ElectronicSignatureProvider;
import com.fitnessuplink.contracts.signature.SignaturePartyResult;
import com.fitnessuplink.contracts.signature.SignatureProviderException;
import com.fitnessuplink.contracts.signature.SignatureSendResult;
import com.fitnessuplink.jobs.JobOfferRepository;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.onboarding.UserUpload;
import com.fitnessuplink.talent.PipelineStatus;
import com.fitnessuplink.talent.RecruitmentService;
import com.fitnessuplink.talent.TalentPipeline;
import com.fitnessuplink.talent.TalentPipelineRepository;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContractServiceTest {

    @Mock private ContractRepository contractRepository;
    @Mock private ContractSignerRepository contractSignerRepository;
    @Mock private ContractHistoryRepository contractHistoryRepository;
    @Mock private TalentPipelineRepository talentPipelineRepository;
    @Mock private JobOfferRepository jobOfferRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserProfileValueRepository userProfileValueRepository;
    @Mock private UploadService uploadService;
    @Mock private RecruitmentService recruitmentService;
    @Mock private NotificationService notificationService;
    @Mock private ElectronicSignatureProvider signatureProvider;
    @Mock private PermissionService permissionService;
    @Mock private com.fitnessuplink.billing.EntitlementService entitlementService;

    private ContractService service;
    private User employer;
    private User otherEmployer;
    private User candidate;
    private User otherCandidate;
    private TalentPipeline recruitment;
    private UUID recruitmentId;
    private byte[] pdf;

    @BeforeEach
    void setUp() {
        service = new ContractService(
                contractRepository,
                contractSignerRepository,
                contractHistoryRepository,
                talentPipelineRepository,
                jobOfferRepository,
                userRepository,
                userProfileValueRepository,
                uploadService,
                recruitmentService,
                notificationService,
                signatureProvider,
                new ObjectMapper(),
                permissionService,
                entitlementService
        );
        employer = user(UUID.randomUUID(), "EMPLOYER", "BUSINESS");
        otherEmployer = user(UUID.randomUUID(), "EMPLOYER", "BUSINESS");
        candidate = user(UUID.randomUUID(), "CANDIDATE", "TALENT");
        otherCandidate = user(UUID.randomUUID(), "CANDIDATE", "TALENT");
        recruitmentId = UUID.randomUUID();
        recruitment = pipeline(PipelineStatus.NEGOTIATION);
        pdf = DraftPdfWriter.write("Contrat", List.of("Poste : Personal Trainer"));
        org.mockito.Mockito.lenient().when(signatureProvider.name()).thenReturn("mock");
        lenient().when(permissionService.has(any(User.class), any())).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            String code = invocation.getArgument(1);
            if (user == null || code == null) {
                return false;
            }
            if (user.isCandidate()) {
                return code.equals(Permissions.HIRE_CONTRACTS_CANDIDATE);
            }
            if (user.isBusiness()) {
                return code.equals(Permissions.HIRE_CONTRACTS_EMPLOYER);
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
        }).when(permissionService).require(any(User.class), any());
    }

    @Test
    void employerCreatesTemplateContract() {
        when(talentPipelineRepository.findByIdAndEmployerId(recruitmentId, employer.getId())).thenReturn(Optional.of(recruitment));
        when(contractRepository.findByRecruitmentIdOrderByCreatedAtDesc(recruitmentId)).thenReturn(List.of());
        when(userRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(userRepository.findById(employer.getId())).thenReturn(Optional.of(employer));
        when(userProfileValueRepository.findByUserId(employer.getId())).thenReturn(List.of());
        UserUpload stored = upload("draft.pdf");
        when(uploadService.storePdfBytes(eq(employer.getId()), eq("contract_original"), any(), any())).thenReturn(stored);
        when(uploadService.loadAny(stored.getId())).thenReturn(new UploadService.LoadedUpload(stored, null));
        when(contractRepository.save(any(Contract.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(contractSignerRepository.findByContractIdOrderBySigningOrderAsc(any())).thenReturn(List.of());

        ContractDto dto = service.create(employer, new CreateContractRequest(
                recruitmentId,
                "TEMPLATE",
                new ContractTermsDto("Personal Trainer", "CDI", "8000", "AED", "2026-10-01", "Dubai", null)
        ));

        assertEquals(ContractStatus.DRAFT, dto.status());
        assertEquals(ContractSource.TEMPLATE, dto.source());
        assertNotNull(dto.originalUploadId());
        verify(contractHistoryRepository).save(any(ContractHistory.class));
    }

    @Test
    void otherEmployerCannotCreateForForeignRecruitment() {
        when(talentPipelineRepository.findByIdAndEmployerId(recruitmentId, otherEmployer.getId())).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class, () -> service.create(otherEmployer, new CreateContractRequest(
                recruitmentId, "IMPORT", null)));
        assertEquals("RECRUITMENT_NOT_FOUND", error.getMessage());
        verify(contractRepository, never()).save(any());
    }

    @Test
    void uploadAcceptsPdf() {
        Contract contract = draft(ContractSource.IMPORT);
        when(contractRepository.findByIdAndEmployerId(contract.getId(), employer.getId())).thenReturn(Optional.of(contract));
        when(uploadService.storePdf(eq(employer.getId()), eq("contract_original"), any())).thenReturn(upload("contract.pdf"));
        when(contractRepository.save(contract)).thenReturn(contract);
        when(userRepository.findById(employer.getId())).thenReturn(Optional.of(employer));
        when(userRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserId(employer.getId())).thenReturn(List.of());
        when(contractSignerRepository.findByContractIdOrderBySigningOrderAsc(contract.getId())).thenReturn(List.of());
        when(uploadService.loadAny(any())).thenReturn(new UploadService.LoadedUpload(upload("contract.pdf"), null));

        MockMultipartFile file = new MockMultipartFile("file", "contract.pdf", "application/pdf", pdf);
        ContractDto dto = service.upload(employer, contract.getId(), file);
        assertEquals("contract.pdf", dto.originalFileName());
    }

    @Test
    void uploadRejectsInvalidTypeFromStore() {
        Contract contract = draft(ContractSource.IMPORT);
        when(contractRepository.findByIdAndEmployerId(contract.getId(), employer.getId())).thenReturn(Optional.of(contract));
        when(uploadService.storePdf(eq(employer.getId()), eq("contract_original"), any()))
                .thenThrow(new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE_TYPE"));

        ApiException error = assertThrows(ApiException.class, () -> service.upload(
                employer,
                contract.getId(),
                new MockMultipartFile("file", "notes.txt", "text/plain", "hello".getBytes())
        ));
        assertEquals("INVALID_FILE_TYPE", error.getMessage());
    }

    @Test
    void sendSuccessMovesRecruitmentToContractSent() {
        Contract contract = draft(ContractSource.IMPORT);
        contract.setOriginalUploadId(UUID.randomUUID());
        stubDraftForSend(contract);
        when(uploadService.readBytes(contract.getOriginalUploadId())).thenReturn(pdf);
        when(signatureProvider.sendForSignature(any())).thenReturn(new SignatureSendResult("mock-1", ContractStatus.SENT));
        when(contractRepository.save(contract)).thenReturn(contract);
        when(talentPipelineRepository.findById(recruitmentId)).thenReturn(Optional.of(recruitment));
        stubDto(contract);

        ContractDto dto = service.send(employer, contract.getId());

        assertEquals(ContractStatus.SENT, dto.status());
        assertEquals("mock-1", contract.getExternalSignatureRequestId());
        verify(recruitmentService).markContractSent(employer, recruitmentId);
        verify(notificationService).notify(eq(candidate.getId()), eq(NotifyCategory.CONTRACT), eq("Nouveau contrat à signer"), any(), any(), any());
    }

    @Test
    void sendFailureKeepsDraftAndNegotiation() {
        Contract contract = draft(ContractSource.IMPORT);
        contract.setOriginalUploadId(UUID.randomUUID());
        stubDraftForSend(contract);
        when(uploadService.readBytes(contract.getOriginalUploadId())).thenReturn(pdf);
        when(signatureProvider.sendForSignature(any())).thenThrow(new SignatureProviderException());

        ApiException error = assertThrows(ApiException.class, () -> service.send(employer, contract.getId()));
        assertEquals("SIGNATURE_PROVIDER_ERROR", error.getMessage());
        assertEquals(ContractStatus.DRAFT, contract.getStatus());
        verify(recruitmentService, never()).markContractSent(any(), any());
    }

    @Test
    void candidateCanReadOwnContract() {
        Contract contract = sent();
        when(contractRepository.findByIdAndCandidateId(contract.getId(), candidate.getId())).thenReturn(Optional.of(contract));
        stubDto(contract);

        ContractDto dto = service.get(candidate, contract.getId());
        assertEquals(contract.getId(), dto.id());
    }

    @Test
    void otherCandidateCannotReadContract() {
        Contract contract = sent();
        when(contractRepository.findByIdAndCandidateId(contract.getId(), otherCandidate.getId())).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class, () -> service.get(otherCandidate, contract.getId()));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        assertEquals("CONTRACT_NOT_FOUND", error.getMessage());
    }

    @Test
    void candidateSignUpdatesStatus() {
        Contract contract = sent();
        when(contractRepository.findByIdAndCandidateId(contract.getId(), candidate.getId())).thenReturn(Optional.of(contract));
        when(signatureProvider.sign("mock-1", ContractSignerRole.CANDIDATE))
                .thenReturn(SignaturePartyResult.of(true, false));
        when(contractSignerRepository.findByContractIdOrderBySigningOrderAsc(contract.getId())).thenReturn(List.of());
        when(contractRepository.save(contract)).thenReturn(contract);
        stubDto(contract);

        ContractDto dto = service.sign(candidate, contract.getId());
        assertEquals(ContractStatus.CANDIDATE_SIGNED, dto.status());
        assertNotNull(contract.getCandidateSignedAt());
        verify(notificationService).notify(eq(employer.getId()), eq(NotifyCategory.CONTRACT), eq("Contrat signé par le candidat"), any(), any(), any());
    }

    @Test
    void employerSignThenCompletedArchivesPdf() {
        Contract contract = sent();
        contract.setStatus(ContractStatus.CANDIDATE_SIGNED);
        contract.setCandidateSignedAt(Instant.now());
        when(contractRepository.findByIdAndEmployerId(contract.getId(), employer.getId())).thenReturn(Optional.of(contract));
        when(signatureProvider.sign("mock-1", ContractSignerRole.EMPLOYER))
                .thenReturn(SignaturePartyResult.of(true, true));
        when(signatureProvider.downloadSignedDocument("mock-1")).thenReturn(pdf);
        when(signatureProvider.downloadAuditTrail("mock-1")).thenReturn(pdf);
        when(uploadService.storePdfBytes(eq(employer.getId()), eq("contract_signed"), any(), any())).thenReturn(upload("signed.pdf"));
        when(uploadService.storePdfBytes(eq(employer.getId()), eq("contract_audit"), any(), any())).thenReturn(upload("audit.pdf"));
        when(contractSignerRepository.findByContractIdOrderBySigningOrderAsc(contract.getId())).thenReturn(List.of());
        when(contractRepository.save(contract)).thenReturn(contract);
        stubDto(contract);

        ContractDto dto = service.sign(employer, contract.getId());
        assertEquals(ContractStatus.COMPLETED, dto.status());
        assertNotNull(contract.getSignedUploadId());
        assertNotNull(contract.getAuditTrailUploadId());
        assertNotNull(contract.getCompletedAt());
    }

    @Test
    void webhookCompletedIsIdempotentFriendly() {
        Contract contract = sent();
        contract.setStatus(ContractStatus.COMPLETED);
        contract.setSignedUploadId(UUID.randomUUID());
        when(contractRepository.findByExternalSignatureRequestId("mock-1")).thenReturn(Optional.of(contract));
        stubDto(contract);

        ContractDto dto = service.applyWebhook("mock", "mock-1", "document.completed");
        assertEquals(ContractStatus.COMPLETED, dto.status());
        verify(signatureProvider, never()).downloadSignedDocument(any());
    }

    @Test
    void webhookCompletedStoresFinalFiles() {
        Contract contract = sent();
        when(contractRepository.findByExternalSignatureRequestId("mock-1")).thenReturn(Optional.of(contract));
        when(signatureProvider.downloadSignedDocument("mock-1")).thenReturn(pdf);
        when(signatureProvider.downloadAuditTrail("mock-1")).thenReturn(pdf);
        when(uploadService.storePdfBytes(eq(employer.getId()), eq("contract_signed"), any(), any())).thenReturn(upload("signed.pdf"));
        when(uploadService.storePdfBytes(eq(employer.getId()), eq("contract_audit"), any(), any())).thenReturn(upload("audit.pdf"));
        when(contractRepository.save(contract)).thenReturn(contract);
        stubDto(contract);

        ContractDto dto = service.applyWebhook("mock", "mock-1", "document.completed");
        assertEquals(ContractStatus.COMPLETED, dto.status());
        verify(contractHistoryRepository).save(any(ContractHistory.class));
    }

    @Test
    void historyIsCreatedOnSend() {
        Contract contract = draft(ContractSource.IMPORT);
        contract.setOriginalUploadId(UUID.randomUUID());
        stubDraftForSend(contract);
        when(uploadService.readBytes(contract.getOriginalUploadId())).thenReturn(pdf);
        when(signatureProvider.sendForSignature(any())).thenReturn(new SignatureSendResult("mock-1", ContractStatus.SENT));
        when(contractRepository.save(contract)).thenReturn(contract);
        when(talentPipelineRepository.findById(recruitmentId)).thenReturn(Optional.of(recruitment));
        stubDto(contract);

        service.send(employer, contract.getId());
        verify(contractHistoryRepository).save(any(ContractHistory.class));
    }

    private void stubDraftForSend(Contract contract) {
        when(contractRepository.findByIdAndEmployerId(contract.getId(), employer.getId())).thenReturn(Optional.of(contract));
        when(contractSignerRepository.findByContractIdOrderBySigningOrderAsc(contract.getId())).thenReturn(List.of(
                signer(contract.getId(), candidate, ContractSignerRole.CANDIDATE, 1),
                signer(contract.getId(), employer, ContractSignerRole.EMPLOYER, 2)
        ));
    }

    private void stubDto(Contract contract) {
        when(userRepository.findById(employer.getId())).thenReturn(Optional.of(employer));
        when(userRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(userProfileValueRepository.findByUserId(employer.getId())).thenReturn(List.of());
        if (contract.getOriginalUploadId() != null) {
            when(uploadService.loadAny(contract.getOriginalUploadId()))
                    .thenReturn(new UploadService.LoadedUpload(upload("contract.pdf"), null));
        }
        when(contractSignerRepository.findByContractIdOrderBySigningOrderAsc(contract.getId())).thenReturn(List.of(
                signer(contract.getId(), candidate, ContractSignerRole.CANDIDATE, 1),
                signer(contract.getId(), employer, ContractSignerRole.EMPLOYER, 2)
        ));
    }

    private Contract draft(ContractSource source) {
        Instant now = Instant.now();
        return Contract.builder()
                .id(UUID.randomUUID())
                .recruitmentId(recruitmentId)
                .employerId(employer.getId())
                .candidateId(candidate.getId())
                .title("Contrat — Sarah Ben Ali")
                .status(ContractStatus.DRAFT)
                .source(source)
                .signatureProvider("mock")
                .createdBy(employer.getId())
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    private Contract sent() {
        Contract contract = draft(ContractSource.IMPORT);
        contract.setStatus(ContractStatus.SENT);
        contract.setOriginalUploadId(UUID.randomUUID());
        contract.setExternalSignatureRequestId("mock-1");
        contract.setSentAt(Instant.now());
        return contract;
    }

    private TalentPipeline pipeline(PipelineStatus status) {
        Instant now = Instant.now();
        return TalentPipeline.builder()
                .id(recruitmentId)
                .employerId(employer.getId())
                .candidateId(candidate.getId())
                .status(status)
                .createdAt(now)
                .updatedAt(now)
                .statusUpdatedAt(now)
                .build();
    }

    private ContractSigner signer(UUID contractId, User user, ContractSignerRole role, int order) {
        return ContractSigner.builder()
                .id(UUID.randomUUID())
                .contractId(contractId)
                .userId(user.getId())
                .role(role)
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .signingOrder(order)
                .build();
    }

    private UserUpload upload(String name) {
        return UserUpload.builder()
                .id(UUID.randomUUID())
                .userId(employer.getId())
                .fieldKey("contract_original")
                .originalFilename(name)
                .contentType("application/pdf")
                .sizeBytes(pdf.length)
                .storagePath("/tmp/" + name)
                .createdAt(Instant.now())
                .build();
    }

    private User user(UUID id, String code, String category) {
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
                .onboardingCompleted(true)
                .build();
        user.setAppRole(role);
        return user;
    }
}
