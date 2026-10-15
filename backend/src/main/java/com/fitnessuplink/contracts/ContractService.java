package com.fitnessuplink.contracts;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.contracts.dto.ContractDto;
import com.fitnessuplink.contracts.dto.ContractHistoryDto;
import com.fitnessuplink.contracts.dto.ContractSignerDto;
import com.fitnessuplink.contracts.dto.ContractSummaryDto;
import com.fitnessuplink.contracts.dto.ContractTermsDto;
import com.fitnessuplink.contracts.dto.CreateContractRequest;
import com.fitnessuplink.contracts.signature.ElectronicSignatureProvider;
import com.fitnessuplink.contracts.signature.SignatureParty;
import com.fitnessuplink.contracts.signature.SignaturePartyResult;
import com.fitnessuplink.contracts.signature.SignatureProviderException;
import com.fitnessuplink.contracts.signature.SignatureRequest;
import com.fitnessuplink.contracts.signature.SignatureSendResult;
import com.fitnessuplink.jobs.JobOfferRepository;
import com.fitnessuplink.jobs.dto.JobOfferSummaryDto;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.onboarding.UserUpload;
import com.fitnessuplink.talent.PipelineStatus;
import com.fitnessuplink.talent.RecruitmentService;
import com.fitnessuplink.talent.TalentPipeline;
import com.fitnessuplink.talent.TalentPipelineRepository;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContractService {

    public static final String TEMPLATE_NOTICE = DraftPdfWriter.TEMPLATE_NOTICE;

    private final ContractRepository contractRepository;
    private final ContractSignerRepository contractSignerRepository;
    private final ContractHistoryRepository contractHistoryRepository;
    private final TalentPipelineRepository talentPipelineRepository;
    private final JobOfferRepository jobOfferRepository;
    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final UploadService uploadService;
    private final RecruitmentService recruitmentService;
    private final NotificationService notificationService;
    private final ElectronicSignatureProvider signatureProvider;
    private final ObjectMapper objectMapper;
    private final PermissionService permissionService;
    private final com.fitnessuplink.billing.EntitlementService entitlementService;

    @Transactional
    public ContractDto create(User employer, CreateContractRequest request) {
        permissionService.require(employer, Permissions.HIRE_CONTRACTS_EMPLOYER);
        entitlementService.require(employer, com.fitnessuplink.billing.Entitlements.CONTRACTS);
        TalentPipeline recruitment = requireOwnedRecruitment(employer.getId(), request.recruitmentId());
        if (recruitment.getStatus() != PipelineStatus.NEGOTIATION) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_RECRUITMENT_TRANSITION");
        }
        ContractSource source = parseSource(request.source());
        Contract existing = latestOpen(recruitment.getId());
        if (existing != null) {
            if (existing.getStatus() == ContractStatus.DRAFT && existing.getSource() == source) {
                if (source == ContractSource.TEMPLATE && request.terms() != null) {
                    return toDto(regenerateTemplateDraft(employer, existing, recruitment, request.terms()));
                }
                return toDto(existing);
            }
            if (existing.getStatus() != ContractStatus.DRAFT
                    && existing.getStatus() != ContractStatus.CANCELLED
                    && existing.getStatus() != ContractStatus.DECLINED
                    && existing.getStatus() != ContractStatus.EXPIRED) {
                throw new ApiException(HttpStatus.CONFLICT, "CONTRACT_ALREADY_SENT");
            }
        }
        User candidate = requireCandidate(recruitment.getCandidateId());
        Instant now = Instant.now();
        String company = employerName(employer);
        String position = positionOf(recruitment, request.terms());
        Contract contract = Contract.builder()
                .id(UUID.randomUUID())
                .recruitmentId(recruitment.getId())
                .employerId(employer.getId())
                .candidateId(candidate.getId())
                .jobOfferId(recruitment.getJobOfferId())
                .title("Contrat — " + candidate.getDisplayName() + " — " + position)
                .status(ContractStatus.DRAFT)
                .source(source)
                .termsJson(source == ContractSource.TEMPLATE ? writeTerms(request.terms()) : null)
                .signatureProvider(signatureProvider.name())
                .createdBy(employer.getId())
                .createdAt(now)
                .updatedAt(now)
                .build();
        if (source == ContractSource.TEMPLATE) {
            if (request.terms() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CONTRACT_STATUS");
            }
            byte[] pdf = DraftPdfWriter.write(
                    contract.getTitle(),
                    templateSections(employer, company, candidate, recruitment, request.terms()),
                    true
            );
            UserUpload upload = uploadService.storePdfBytes(
                    employer.getId(),
                    "contract_original",
                    "contrat-" + slug(candidate.getDisplayName()) + ".pdf",
                    pdf
            );
            contract.setOriginalUploadId(upload.getId());
        }
        contractRepository.save(contract);
        saveSigners(contract, employer, candidate);
        history(contract, "CREATED", employer.getId(), "EMPLOYER", null, ContractStatus.DRAFT, company);
        return toDto(contract);
    }

    @Transactional
    public ContractDto upload(User employer, UUID id, MultipartFile file) {
        permissionService.require(employer, Permissions.HIRE_CONTRACTS_EMPLOYER);
        Contract contract = requireEmployerDraft(employer.getId(), id);
        if (contract.getSource() != ContractSource.IMPORT) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_CONTRACT_STATUS");
        }
        UserUpload upload = uploadService.storePdf(employer.getId(), "contract_original", file);
        contract.setOriginalUploadId(upload.getId());
        contract.setUpdatedAt(Instant.now());
        history(contract, "DOCUMENT_UPLOADED", employer.getId(), "EMPLOYER", contract.getStatus(), contract.getStatus(), upload.getOriginalFilename());
        return toDto(contractRepository.save(contract));
    }

    @Transactional
    public ContractDto send(User employer, UUID id) {
        permissionService.require(employer, Permissions.HIRE_CONTRACTS_EMPLOYER);
        Contract contract = requireEmployerDraft(employer.getId(), id);
        if (contract.getOriginalUploadId() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "CONTRACT_REQUIRED");
        }
        List<ContractSigner> signers = contractSignerRepository.findByContractIdOrderBySigningOrderAsc(contract.getId());
        if (signers.size() < 2) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_CONTRACT_STATUS");
        }
        byte[] document = uploadService.readBytes(contract.getOriginalUploadId());
        SignatureSendResult result;
        try {
            result = signatureProvider.sendForSignature(new SignatureRequest(
                    contract.getId(),
                    contract.getTitle(),
                    document,
                    "contrat.pdf",
                    signers.stream()
                            .map(signer -> new SignatureParty(signer.getUserId(), signer.getRole().name(), signer.getDisplayName(), signer.getEmail()))
                            .toList()
            ));
        } catch (SignatureProviderException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new SignatureProviderException();
        }
        Instant now = Instant.now();
        ContractStatus previous = contract.getStatus();
        contract.setExternalSignatureRequestId(result.externalId());
        contract.setStatus(ContractStatus.SENT);
        contract.setSentAt(now);
        contract.setUpdatedAt(now);
        contractRepository.save(contract);
        history(contract, "SENT", employer.getId(), "EMPLOYER", previous, ContractStatus.SENT, result.externalId());
        recruitmentService.markContractSent(employer, contract.getRecruitmentId());
        String company = employerName(employer);
        String position = positionOf(contract);
        notificationService.notify(
                contract.getCandidateId(),
                NotifyCategory.CONTRACT,
                "Nouveau contrat à signer",
                company + " vous a envoyé un contrat pour le poste " + position + ".",
                "Consulter le contrat",
                "/contracts/" + contract.getId()
        );
        return toDto(contract);
    }

    @Transactional
    public ContractDto sign(User user, UUID id) {
        Contract contract = requireParty(user, id);
        if (contract.getStatus() != ContractStatus.SENT
                && contract.getStatus() != ContractStatus.CANDIDATE_SIGNED
                && contract.getStatus() != ContractStatus.EMPLOYER_SIGNED) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_CONTRACT_STATUS");
        }
        ContractSignerRole role = user.getId().equals(contract.getCandidateId())
                ? ContractSignerRole.CANDIDATE
                : ContractSignerRole.EMPLOYER;
        if (role == ContractSignerRole.CANDIDATE) {
            // The candidate downloads the contract, signs it by hand and uploads it (see uploadCandidateSigned).
            throw new ApiException(HttpStatus.CONFLICT, "CANDIDATE_MUST_UPLOAD");
        }
        if (role == ContractSignerRole.EMPLOYER && contract.getEmployerSignedAt() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_CONTRACT_STATUS");
        }
        if (contract.getExternalSignatureRequestId() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "SIGNATURE_PROVIDER_ERROR");
        }
        SignaturePartyResult result;
        try {
            result = signatureProvider.sign(contract.getExternalSignatureRequestId(), role);
        } catch (SignatureProviderException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new SignatureProviderException();
        }
        applySignatureResult(contract, user, role, result);
        return toDto(contract);
    }

    @Transactional
    public ContractDto cancel(User employer, UUID id) {
        permissionService.require(employer, Permissions.HIRE_CONTRACTS_EMPLOYER);
        Contract contract = contractRepository.findByIdAndEmployerId(id, employer.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));
        if (contract.getStatus() == ContractStatus.COMPLETED) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_CONTRACT_STATUS");
        }
        if (contract.getExternalSignatureRequestId() != null) {
            signatureProvider.cancel(contract.getExternalSignatureRequestId());
        }
        ContractStatus previous = contract.getStatus();
        contract.setStatus(ContractStatus.CANCELLED);
        contract.setUpdatedAt(Instant.now());
        history(contract, "CANCELLED", employer.getId(), "EMPLOYER", previous, ContractStatus.CANCELLED, null);
        return toDto(contractRepository.save(contract));
    }

    @Transactional(readOnly = true)
    public ContractDto get(User user, UUID id) {
        return toDto(requireParty(user, id));
    }

    @Transactional(readOnly = true)
    public List<ContractDto> list(User user) {
        List<Contract> rows;
        if (permissionService.has(user, Permissions.HIRE_CONTRACTS_EMPLOYER) && user.isOnboardingCompleted()) {
            rows = contractRepository.findByEmployerIdOrderByUpdatedAtDesc(user.getId());
        } else if (permissionService.has(user, Permissions.HIRE_CONTRACTS_CANDIDATE) && user.isOnboardingCompleted()) {
            rows = contractRepository.findByCandidateIdOrderByUpdatedAtDesc(user.getId());
        } else {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        return rows.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ContractHistoryDto> history(User user, UUID id) {
        requireParty(user, id);
        return contractHistoryRepository.findByContractIdOrderByCreatedAtAsc(id).stream()
                .map(item -> new ContractHistoryDto(
                        item.getId(),
                        item.getEvent(),
                        item.getActorId(),
                        item.getActorType(),
                        item.getPreviousStatus(),
                        item.getNewStatus(),
                        item.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload document(User user, UUID id, boolean signed) {
        Contract contract = requireParty(user, id);
        UUID uploadId = signed ? contract.getSignedUploadId() : contract.getOriginalUploadId();
        if (signed && uploadId == null) {
            uploadId = contract.getOriginalUploadId();
        }
        if (uploadId == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND");
        }
        return uploadService.loadAny(uploadId);
    }

    @Transactional
    public ContractDto applyWebhook(String provider, String externalId, String event) {
        Contract contract = contractRepository.findByExternalSignatureRequestId(externalId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));
        if (!signatureProvider.name().equalsIgnoreCase(provider) && !"mock".equalsIgnoreCase(provider)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SIGNATURE_PROVIDER_ERROR");
        }
        return switch (event) {
            case "document.sent" -> toDto(contract);
            case "candidate.signed" -> applyWebhookSign(contract, ContractSignerRole.CANDIDATE);
            case "employer.signed" -> applyWebhookSign(contract, ContractSignerRole.EMPLOYER);
            case "document.completed" -> completeFromProvider(contract);
            case "document.declined" -> decline(contract);
            case "document.expired" -> expire(contract);
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "SIGNATURE_PROVIDER_ERROR");
        };
    }

    public ContractSummaryDto summaryOf(UUID recruitmentId) {
        return contractRepository.findByRecruitmentIdOrderByCreatedAtDesc(recruitmentId).stream()
                .max(Comparator.comparing(Contract::getCreatedAt))
                .map(this::toSummary)
                .orElse(null);
    }

    public Map<UUID, ContractSummaryDto> summariesOf(List<UUID> recruitmentIds) {
        if (recruitmentIds.isEmpty()) {
            return Map.of();
        }
        return contractRepository.findByRecruitmentIdIn(recruitmentIds).stream()
                .collect(Collectors.groupingBy(Contract::getRecruitmentId))
                .entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> toSummary(entry.getValue().stream().max(Comparator.comparing(Contract::getCreatedAt)).orElseThrow())
                ));
    }

    public boolean hasCompleted(UUID recruitmentId) {
        return contractRepository.existsByRecruitmentIdAndStatus(recruitmentId, ContractStatus.COMPLETED);
    }

    private ContractDto applyWebhookSign(Contract contract, ContractSignerRole role) {
        User actor = userRepository.findById(
                role == ContractSignerRole.CANDIDATE ? contract.getCandidateId() : contract.getEmployerId()
        ).orElseThrow();
        SignaturePartyResult result = SignaturePartyResult.after(
                role,
                contract.getCandidateSignedAt() != null,
                contract.getEmployerSignedAt() != null
        );
        applySignatureResult(contract, actor, role, result);
        return toDto(contract);
    }

    private void applySignatureResult(Contract contract, User actor, ContractSignerRole role, SignaturePartyResult result) {
        Instant now = Instant.now();
        ContractStatus previous = contract.getStatus();
        if (role == ContractSignerRole.CANDIDATE && contract.getCandidateSignedAt() == null) {
            contract.setCandidateSignedAt(now);
            markSigner(contract.getId(), role, now);
            history(contract, "CANDIDATE_SIGNED", actor.getId(), "CANDIDATE", previous, result.status(), null);
            notificationService.notify(
                    contract.getEmployerId(),
                    NotifyCategory.CONTRACT,
                    "Contrat signé par le candidat",
                    actor.getDisplayName() + " a signé son contrat.",
                    "Voir le contrat",
                    "/contracts/" + contract.getId()
            );
        }
        if (role == ContractSignerRole.EMPLOYER && contract.getEmployerSignedAt() == null) {
            contract.setEmployerSignedAt(now);
            markSigner(contract.getId(), role, now);
            history(contract, "EMPLOYER_SIGNED", actor.getId(), "EMPLOYER", previous, result.status(), null);
            notificationService.notify(
                    contract.getCandidateId(),
                    NotifyCategory.CONTRACT,
                    "Contrat signé par l’employeur",
                    employerName(actor) + " a signé le contrat.",
                    "Consulter le contrat",
                    "/contracts/" + contract.getId()
            );
        }
        contract.setStatus(result.status());
        contract.setUpdatedAt(now);
        if (contract.getCandidateUploadId() != null && contract.getCandidateSignedAt() != null && contract.getEmployerSignedAt() != null) {
            completeManually(contract, previous);
        } else if (result.completed()) {
            completeFromProvider(contract);
        } else {
            contractRepository.save(contract);
        }
    }

    @Transactional
    public ContractDto uploadCandidateSigned(User candidate, UUID id, MultipartFile file) {
        permissionService.require(candidate, Permissions.HIRE_CONTRACTS_CANDIDATE);
        Contract contract = contractRepository.findByIdAndCandidateId(id, candidate.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));
        if (contract.getStatus() != ContractStatus.SENT && contract.getStatus() != ContractStatus.EMPLOYER_SIGNED) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_CONTRACT_STATUS");
        }
        if (contract.getCandidateSignedAt() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "CONTRACT_ALREADY_SIGNED");
        }
        UserUpload upload = uploadService.storePdf(candidate.getId(), "contract_candidate_signed", file);
        Instant now = Instant.now();
        ContractStatus previous = contract.getStatus();
        contract.setCandidateUploadId(upload.getId());
        contract.setCandidateSignedAt(now);
        contract.setUpdatedAt(now);
        markSigner(contract.getId(), ContractSignerRole.CANDIDATE, now);
        history(contract, "CANDIDATE_SIGNED", candidate.getId(), "CANDIDATE", previous, ContractStatus.CANDIDATE_SIGNED, upload.getOriginalFilename());
        notificationService.notify(
                contract.getEmployerId(),
                NotifyCategory.CONTRACT,
                "Contrat signé par le candidat",
                candidate.getDisplayName() + " a renvoyé son contrat signé.",
                "Voir le contrat",
                "/contracts/" + contract.getId()
        );
        if (contract.getEmployerSignedAt() != null) {
            completeManually(contract, previous);
        } else {
            contract.setStatus(ContractStatus.CANDIDATE_SIGNED);
            contractRepository.save(contract);
        }
        return toDto(contract);
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload candidateDocument(User user, UUID id) {
        Contract contract = requireParty(user, id);
        if (contract.getCandidateUploadId() == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND");
        }
        return uploadService.loadAny(contract.getCandidateUploadId());
    }

    /** Both parties signed and the candidate's signed copy is on file: the contract is final. */
    private void completeManually(Contract contract, ContractStatus previous) {
        Instant now = Instant.now();
        contract.setSignedUploadId(contract.getCandidateUploadId());
        contract.setStatus(ContractStatus.COMPLETED);
        contract.setCompletedAt(now);
        contract.setUpdatedAt(now);
        contractRepository.save(contract);
        history(contract, "COMPLETED", null, "SYSTEM", previous, ContractStatus.COMPLETED, null);
        notificationService.notify(
                contract.getCandidateId(),
                NotifyCategory.CONTRACT,
                "Contrat finalisé",
                "Le contrat a été signé par les deux parties.",
                "Télécharger le PDF",
                "/contracts/" + contract.getId()
        );
        notificationService.notify(
                contract.getEmployerId(),
                NotifyCategory.CONTRACT,
                "Contrat finalisé",
                "Le contrat a été signé par les deux parties.",
                "Marquer comme recruté",
                "/contracts/" + contract.getId()
        );
    }

    private ContractDto completeFromProvider(Contract contract) {
        if (contract.getStatus() == ContractStatus.COMPLETED && contract.getSignedUploadId() != null) {
            return toDto(contract);
        }
        Instant now = Instant.now();
        String externalId = contract.getExternalSignatureRequestId();
        byte[] signed;
        byte[] audit;
        try {
            signed = signatureProvider.downloadSignedDocument(externalId);
            audit = signatureProvider.downloadAuditTrail(externalId);
        } catch (RuntimeException ex) {
            throw new SignatureProviderException();
        }
        UserUpload signedUpload = uploadService.storePdfBytes(
                contract.getEmployerId(),
                "contract_signed",
                "contrat-signe-" + contract.getId() + ".pdf",
                signed
        );
        UserUpload auditUpload = uploadService.storePdfBytes(
                contract.getEmployerId(),
                "contract_audit",
                "preuve-signature-" + contract.getId() + ".pdf",
                audit
        );
        ContractStatus previous = contract.getStatus();
        contract.setSignedUploadId(signedUpload.getId());
        contract.setAuditTrailUploadId(auditUpload.getId());
        contract.setStatus(ContractStatus.COMPLETED);
        contract.setCompletedAt(now);
        contract.setUpdatedAt(now);
        if (contract.getCandidateSignedAt() == null) {
            contract.setCandidateSignedAt(now);
        }
        if (contract.getEmployerSignedAt() == null) {
            contract.setEmployerSignedAt(now);
        }
        contractRepository.save(contract);
        history(contract, "COMPLETED", null, "SYSTEM", previous, ContractStatus.COMPLETED, externalId);
        notificationService.notify(
                contract.getCandidateId(),
                NotifyCategory.CONTRACT,
                "Contrat finalisé",
                "Le contrat a été signé par les deux parties.",
                "Télécharger le PDF",
                "/contracts/" + contract.getId()
        );
        notificationService.notify(
                contract.getEmployerId(),
                NotifyCategory.CONTRACT,
                "Contrat finalisé",
                "Le contrat a été signé par les deux parties.",
                "Marquer comme recruté",
                "/pipeline"
        );
        return toDto(contract);
    }

    private ContractDto decline(Contract contract) {
        ContractStatus previous = contract.getStatus();
        contract.setStatus(ContractStatus.DECLINED);
        contract.setUpdatedAt(Instant.now());
        history(contract, "DECLINED", null, "SYSTEM", previous, ContractStatus.DECLINED, null);
        return toDto(contractRepository.save(contract));
    }

    private ContractDto expire(Contract contract) {
        ContractStatus previous = contract.getStatus();
        contract.setStatus(ContractStatus.EXPIRED);
        contract.setUpdatedAt(Instant.now());
        history(contract, "EXPIRED", null, "SYSTEM", previous, ContractStatus.EXPIRED, null);
        return toDto(contractRepository.save(contract));
    }

    private void markSigner(UUID contractId, ContractSignerRole role, Instant at) {
        contractSignerRepository.findByContractIdOrderBySigningOrderAsc(contractId).stream()
                .filter(signer -> signer.getRole() == role)
                .findFirst()
                .ifPresent(signer -> {
                    signer.setSignedAt(at);
                    contractSignerRepository.save(signer);
                });
    }

    private void saveSigners(Contract contract, User employer, User candidate) {
        contractSignerRepository.save(ContractSigner.builder()
                .id(UUID.randomUUID())
                .contractId(contract.getId())
                .userId(candidate.getId())
                .role(ContractSignerRole.CANDIDATE)
                .displayName(candidate.getDisplayName())
                .email(candidate.getEmail())
                .signingOrder(1)
                .build());
        contractSignerRepository.save(ContractSigner.builder()
                .id(UUID.randomUUID())
                .contractId(contract.getId())
                .userId(employer.getId())
                .role(ContractSignerRole.EMPLOYER)
                .displayName(employerName(employer))
                .email(employer.getEmail())
                .signingOrder(2)
                .build());
    }

    private void history(
            Contract contract,
            String event,
            UUID actorId,
            String actorType,
            ContractStatus previous,
            ContractStatus next,
            String metadata
    ) {
        contractHistoryRepository.save(ContractHistory.builder()
                .id(UUID.randomUUID())
                .contractId(contract.getId())
                .event(event)
                .actorId(actorId)
                .actorType(actorType)
                .previousStatus(previous == null ? null : previous.name())
                .newStatus(next == null ? null : next.name())
                .metadata(metadata)
                .createdAt(Instant.now())
                .build());
    }

    private TalentPipeline requireOwnedRecruitment(UUID employerId, UUID recruitmentId) {
        return talentPipelineRepository.findByIdAndEmployerId(recruitmentId, employerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECRUITMENT_NOT_FOUND"));
    }

    private Contract requireEmployerDraft(UUID employerId, UUID id) {
        Contract contract = contractRepository.findByIdAndEmployerId(id, employerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));
        if (contract.getStatus() != ContractStatus.DRAFT) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_CONTRACT_STATUS");
        }
        return contract;
    }

    private Contract requireParty(User user, UUID id) {
        if (user.isSuperAdmin()) {
            return contractRepository.findById(id)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));
        }
        if (permissionService.has(user, Permissions.HIRE_CONTRACTS_EMPLOYER)) {
            return contractRepository.findByIdAndEmployerId(id, user.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));
        }
        if (permissionService.has(user, Permissions.HIRE_CONTRACTS_CANDIDATE)) {
            return contractRepository.findByIdAndCandidateId(id, user.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    private User requireCandidate(UUID candidateId) {
        User candidate = userRepository.findById(candidateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CANDIDATE_NOT_FOUND"));
        if (!candidate.isCandidate()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CANDIDATE_NOT_FOUND");
        }
        return candidate;
    }

    private Contract latestOpen(UUID recruitmentId) {
        return contractRepository.findByRecruitmentIdOrderByCreatedAtDesc(recruitmentId).stream()
                .findFirst()
                .orElse(null);
    }

    private ContractSource parseSource(String source) {
        try {
            return ContractSource.valueOf(source.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CONTRACT_STATUS");
        }
    }

    private ContractDto toDto(Contract contract) {
        User employer = userRepository.findById(contract.getEmployerId()).orElseThrow();
        User candidate = userRepository.findById(contract.getCandidateId()).orElseThrow();
        JobOfferSummaryDto offer = null;
        if (contract.getJobOfferId() != null) {
            offer = jobOfferRepository.findById(contract.getJobOfferId())
                    .map(item -> new JobOfferSummaryDto(item.getId(), item.getTitle(), item.getPosition(), item.getLocation()))
                    .orElse(null);
        }
        String originalName = null;
        if (contract.getOriginalUploadId() != null) {
            originalName = uploadService.loadAny(contract.getOriginalUploadId()).upload().getOriginalFilename();
        }
        List<ContractSignerDto> signers = contractSignerRepository.findByContractIdOrderBySigningOrderAsc(contract.getId())
                .stream()
                .map(signer -> new ContractSignerDto(
                        signer.getId(),
                        signer.getUserId(),
                        signer.getRole(),
                        signer.getDisplayName(),
                        signer.getEmail(),
                        signer.getSigningOrder(),
                        signer.getSignedAt()
                ))
                .toList();
        return new ContractDto(
                contract.getId(),
                contract.getRecruitmentId(),
                contract.getEmployerId(),
                contract.getCandidateId(),
                contract.getTitle(),
                contract.getStatus(),
                contract.getSource(),
                employerName(employer),
                candidate.getDisplayName(),
                candidate.getEmail(),
                employer.getEmail(),
                offer,
                contract.getJobOfferId() == null,
                readTerms(contract.getTermsJson()),
                originalName,
                contract.getOriginalUploadId(),
                contract.getSignedUploadId(),
                contract.getAuditTrailUploadId(),
                false,
                contract.getSource() == ContractSource.TEMPLATE ? TEMPLATE_NOTICE : null,
                signers,
                contract.getCreatedAt(),
                contract.getSentAt(),
                contract.getCandidateSignedAt(),
                contract.getEmployerSignedAt(),
                contract.getCompletedAt(),
                contract.getCandidateUploadId()
        );
    }

    private ContractSummaryDto toSummary(Contract contract) {
        return new ContractSummaryDto(
                contract.getId(),
                contract.getStatus(),
                contract.getCandidateSignedAt() != null,
                contract.getEmployerSignedAt() != null,
                contract.getStatus() == ContractStatus.COMPLETED,
                contract.getSentAt()
        );
    }

    private String employerName(User employer) {
        Map<String, String> values = userProfileValueRepository.findByUserId(employer.getId()).stream()
                .filter(item -> item.getValue() != null)
                .collect(Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (left, right) -> left));
        String trade = values.get("trade_name");
        if (trade != null && !trade.isBlank()) {
            return trade.trim();
        }
        String legal = values.get("legal_name");
        if (legal != null && !legal.isBlank()) {
            return legal.trim();
        }
        return employer.getDisplayName();
    }

    private String positionOf(TalentPipeline recruitment, ContractTermsDto terms) {
        if (terms != null && terms.position() != null && !terms.position().isBlank()) {
            return terms.position().trim();
        }
        if (recruitment.getJobOfferId() != null) {
            return jobOfferRepository.findById(recruitment.getJobOfferId())
                    .map(offer -> offer.getPosition() == null || offer.getPosition().isBlank() ? offer.getTitle() : offer.getPosition())
                    .orElse("Recrutement direct");
        }
        return "Recrutement direct";
    }

    private String positionOf(Contract contract) {
        return positionOf(
                talentPipelineRepository.findById(contract.getRecruitmentId()).orElseThrow(),
                readTerms(contract.getTermsJson())
        );
    }

    /** Rebuilds the PDF of a draft with the latest terms, so going back and editing is never ignored. */
    private Contract regenerateTemplateDraft(User employer, Contract draft, TalentPipeline recruitment, ContractTermsDto terms) {
        User candidate = requireCandidate(recruitment.getCandidateId());
        String company = employerName(employer);
        byte[] pdf = DraftPdfWriter.write(
                "Contrat — " + candidate.getDisplayName() + " — " + positionOf(recruitment, terms),
                templateSections(employer, company, candidate, recruitment, terms),
                true
        );
        UserUpload upload = uploadService.storePdfBytes(
                employer.getId(),
                "contract_original",
                "contrat-" + slug(candidate.getDisplayName()) + ".pdf",
                pdf
        );
        draft.setTitle("Contrat — " + candidate.getDisplayName() + " — " + positionOf(recruitment, terms));
        draft.setTermsJson(writeTerms(terms));
        draft.setOriginalUploadId(upload.getId());
        draft.setUpdatedAt(Instant.now());
        return contractRepository.save(draft);
    }

    private Map<String, String> profileOf(User user) {
        return userProfileValueRepository.findByUserId(user.getId()).stream()
                .filter(item -> item.getValue() != null && !item.getValue().isBlank())
                .collect(Collectors.toMap(UserProfileValue::getFieldKey, item -> item.getValue().trim(), (left, right) -> left));
    }

    /** First readable text found in a repeatable field stored as JSON (e.g. the legal representative). */
    private String firstEntryText(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            var node = objectMapper.readTree(json);
            var first = node.isArray() ? (node.isEmpty() ? null : node.get(0)) : node;
            if (first == null) {
                return null;
            }
            if (first.isTextual()) {
                return first.asText();
            }
            List<String> parts = new ArrayList<>();
            first.fields().forEachRemaining(entry -> {
                if (entry.getValue().isTextual() && !entry.getValue().asText().isBlank()) {
                    parts.add(entry.getValue().asText().trim());
                }
            });
            return parts.isEmpty() ? null : String.join(" - ", parts);
        } catch (Exception ex) {
            return json.length() > 120 ? null : json;
        }
    }

    private List<DraftPdfWriter.Section> templateSections(
            User employer,
            String company,
            User candidate,
            TalentPipeline recruitment,
            ContractTermsDto terms
    ) {
        Map<String, String> org = profileOf(employer);
        Map<String, String> person = profileOf(candidate);
        String legalName = org.get("legal_name");
        List<DraftPdfWriter.Row> employerRows = new ArrayList<>();
        employerRows.add(new DraftPdfWriter.Row("Raison sociale", legalName != null ? legalName : company));
        if (legalName != null && !legalName.equalsIgnoreCase(company)) {
            employerRows.add(new DraftPdfWriter.Row("Nom commercial", company));
        }
        employerRows.add(new DraftPdfWriter.Row("Matricule fiscal", org.get("tax_id")));
        employerRows.add(new DraftPdfWriter.Row("Registre de commerce", org.get("trade_register_number")));
        employerRows.add(new DraftPdfWriter.Row("Patente", org.get("patente_number")));
        String address = String.join(", ", java.util.stream.Stream.of(org.get("org_address"), org.get("org_city"))
                .filter(item -> item != null && !item.isBlank()).toList());
        employerRows.add(new DraftPdfWriter.Row("Adresse", address));
        employerRows.add(new DraftPdfWriter.Row("Téléphone", org.get("org_phone")));
        employerRows.add(new DraftPdfWriter.Row("E-mail", blank(org.get("org_email"), employer.getEmail())));
        employerRows.add(new DraftPdfWriter.Row("Représentant légal", firstEntryText(org.get("legal_representative"))));
        employerRows.add(new DraftPdfWriter.Row("CIN du représentant", org.get("representative_cin")));

        List<DraftPdfWriter.Row> candidateRows = new ArrayList<>();
        candidateRows.add(new DraftPdfWriter.Row("Nom et prénom", candidate.getDisplayName()));
        candidateRows.add(new DraftPdfWriter.Row("E-mail", candidate.getEmail()));
        candidateRows.add(new DraftPdfWriter.Row("Téléphone", person.get("phone")));
        candidateRows.add(new DraftPdfWriter.Row("Ville", person.get("city")));
        candidateRows.add(new DraftPdfWriter.Row("Pièce d'identité", person.get("representative_cin")));

        String salary = (blank(terms.salaryAmount(), "").isBlank() ? "-" : terms.salaryAmount().trim())
                + (blank(terms.salaryCurrency(), "").isBlank() ? "" : " " + terms.salaryCurrency().trim());
        List<DraftPdfWriter.Row> objectRows = new ArrayList<>();
        objectRows.add(new DraftPdfWriter.Row("Poste", blank(terms.position(), positionOf(recruitment, terms))));
        objectRows.add(new DraftPdfWriter.Row("Type de contrat", blank(terms.contractType(), "Non renseigné")));
        objectRows.add(new DraftPdfWriter.Row("Rémunération", salary));
        objectRows.add(new DraftPdfWriter.Row("Date de début", blank(terms.startDate(), "-")));
        objectRows.add(new DraftPdfWriter.Row("Lieu de travail", blank(terms.location(), "-")));
        if (terms.extra() != null && !terms.extra().isBlank()) {
            objectRows.add(new DraftPdfWriter.Row("Informations complémentaires", terms.extra().trim()));
        }

        return List.of(
                DraftPdfWriter.Section.rows("Entre l'employeur", employerRows),
                DraftPdfWriter.Section.rows("Et le candidat", candidateRows),
                DraftPdfWriter.Section.rows("Objet du contrat", objectRows),
                DraftPdfWriter.Section.text("Clauses juridiques", List.of(
                        "Les clauses juridiques (durée, rupture, non-concurrence, propriété intellectuelle, droit applicable) "
                                + "ne sont pas générées. Elles devront être fournies par un modèle valide avant toute signature."
                ))
        );
    }

    private String writeTerms(ContractTermsDto terms) {
        try {
            return objectMapper.writeValueAsString(terms == null ? new ContractTermsDto(null, null, null, null, null, null, null) : terms);
        } catch (Exception ex) {
            return null;
        }
    }

    private ContractTermsDto readTerms(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, ContractTermsDto.class);
        } catch (Exception ex) {
            return null;
        }
    }

    private String slug(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }

    private String blank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
