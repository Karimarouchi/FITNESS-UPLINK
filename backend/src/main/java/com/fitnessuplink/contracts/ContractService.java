package com.fitnessuplink.contracts;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import com.fitnessuplink.jobs.JobOfferService;
import com.fitnessuplink.jobs.dto.JobOfferSummaryDto;
import com.fitnessuplink.notifications.NotificationService;
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

    @Transactional
    public ContractDto create(User employer, CreateContractRequest request) {
        JobOfferService.requireEmployer(employer);
        TalentPipeline recruitment = requireOwnedRecruitment(employer.getId(), request.recruitmentId());
        if (recruitment.getStatus() != PipelineStatus.NEGOTIATION) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_RECRUITMENT_TRANSITION");
        }
        ContractSource source = parseSource(request.source());
        Contract existing = latestOpen(recruitment.getId());
        if (existing != null) {
            if (existing.getStatus() == ContractStatus.DRAFT && existing.getSource() == source) {
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
            byte[] pdf = DraftPdfWriter.write(contract.getTitle(), templateLines(company, candidate, recruitment, request.terms()));
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
        JobOfferService.requireEmployer(employer);
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
        JobOfferService.requireEmployer(employer);
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
        if (role == ContractSignerRole.CANDIDATE && contract.getCandidateSignedAt() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_CONTRACT_STATUS");
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
        JobOfferService.requireEmployer(employer);
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
        if (user.isBusiness() && user.isOnboardingCompleted()) {
            rows = contractRepository.findByEmployerIdOrderByUpdatedAtDesc(user.getId());
        } else if (user.isCandidate()) {
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
                    "Contrat signé par l’employeur",
                    employerName(actor) + " a signé le contrat.",
                    "Consulter le contrat",
                    "/contracts/" + contract.getId()
            );
        }
        contract.setStatus(result.status());
        contract.setUpdatedAt(now);
        if (result.completed()) {
            completeFromProvider(contract);
        } else {
            contractRepository.save(contract);
        }
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
                "Contrat finalisé",
                "Le contrat a été signé par les deux parties.",
                "Télécharger le PDF",
                "/contracts/" + contract.getId()
        );
        notificationService.notify(
                contract.getEmployerId(),
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
        if (user.isBusiness()) {
            return contractRepository.findByIdAndEmployerId(id, user.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));
        }
        if (user.isCandidate()) {
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
                contract.getCompletedAt()
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

    private List<String> templateLines(String company, User candidate, TalentPipeline recruitment, ContractTermsDto terms) {
        List<String> lines = new ArrayList<>();
        lines.add("Employeur : " + company);
        lines.add("Candidat : " + candidate.getDisplayName() + " — " + candidate.getEmail());
        lines.add("Poste : " + blank(terms.position(), positionOf(recruitment, terms)));
        lines.add("Type de contrat : " + blank(terms.contractType(), "Non renseigne"));
        lines.add("Salaire : " + blank(terms.salaryAmount(), "—") + " " + blank(terms.salaryCurrency(), ""));
        lines.add("Date de debut : " + blank(terms.startDate(), "—"));
        lines.add("Lieu : " + blank(terms.location(), "—"));
        if (terms.extra() != null && !terms.extra().isBlank()) {
            lines.add("Informations complementaires : " + terms.extra().trim());
        }
        lines.add("");
        lines.add("Les clauses juridiques (duree, rupture, non-concurrence, propriete intellectuelle, droit applicable)");
        lines.add("ne sont pas generees. Elles devront etre fournies par un modele valide.");
        return lines;
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
