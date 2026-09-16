package com.fitnessuplink.talent;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.contracts.Contract;
import com.fitnessuplink.contracts.ContractRepository;
import com.fitnessuplink.contracts.ContractStatus;
import com.fitnessuplink.contracts.dto.ContractSummaryDto;
import com.fitnessuplink.jobs.JobOffer;
import com.fitnessuplink.jobs.JobOfferRepository;
import com.fitnessuplink.jobs.JobOfferService;
import com.fitnessuplink.jobs.JobOfferStatus;
import com.fitnessuplink.jobs.dto.JobOfferSummaryDto;
import com.fitnessuplink.auth.mail.HireMailService;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.onboarding.UserUpload;
import com.fitnessuplink.talent.dto.ApplyOpportunityRequest;
import com.fitnessuplink.talent.dto.CreateRecruitmentRequest;
import com.fitnessuplink.talent.dto.FileRef;
import com.fitnessuplink.talent.dto.UpdateRecruitmentStatusRequest;
import com.fitnessuplink.talent.dto.RecruitmentCandidateDto;
import com.fitnessuplink.talent.dto.RecruitmentConversationDto;
import com.fitnessuplink.talent.dto.RecruitmentDto;
import com.fitnessuplink.talent.dto.RecruitmentEmployerDto;
import com.fitnessuplink.talent.dto.RecruitmentMessageDto;
import com.fitnessuplink.talent.dto.RecruitmentSummaryDto;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.dto.CountrySummary;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecruitmentService {

    private static final Pattern UPLOAD_ID = Pattern.compile("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"");
    private static final String COVER_LETTER_FIELD = "cover_letter";
    private static final int COVER_LETTER_MAX = 4000;
    private static final int MESSAGE_MAX = 2000;
    private static final String HIRE_FILE_FIELD = "hire_message";
    private static final ZoneId INTERVIEW_ZONE = ZoneId.of("Africa/Tunis");
    private static final DateTimeFormatter INTERVIEW_DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(INTERVIEW_ZONE);
    private static final DateTimeFormatter INTERVIEW_HOUR = DateTimeFormatter.ofPattern("HH:mm").withZone(INTERVIEW_ZONE);

    private final TalentPipelineRepository talentPipelineRepository;
    private final RecruitmentMessageRepository recruitmentMessageRepository;
    private final HireReportRepository hireReportRepository;
    private final HireAbuseGuard hireAbuseGuard;
    private final JobOfferRepository jobOfferRepository;
    private final JobOfferService jobOfferService;
    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final ContractRepository contractRepository;
    private final PermissionService permissionService;
    private final UploadService uploadService;
    private final NotificationService notificationService;
    private final HireMailService hireMailService;
    private final com.fitnessuplink.billing.EntitlementService entitlementService;

    @Transactional
    public RecruitmentDto create(User employer, CreateRecruitmentRequest request) {
        permissionService.require(employer, Permissions.HIRE_PIPELINE);
        entitlementService.require(employer, com.fitnessuplink.billing.Entitlements.CONTACT);
        User candidate = requireCandidate(request.candidateId());
        UUID jobOfferId = request.jobOfferId();
        if (jobOfferId != null) {
            jobOfferService.requireOwned(employer.getId(), jobOfferId);
        }
        if (alreadyExists(employer.getId(), candidate.getId(), jobOfferId)) {
            throw new ApiException(HttpStatus.CONFLICT, "RECRUITMENT_ALREADY_EXISTS");
        }
        Instant now = Instant.now();
        TalentPipeline entry = TalentPipeline.builder()
                .id(UUID.randomUUID())
                .employerId(employer.getId())
                .candidateId(candidate.getId())
                .jobOfferId(jobOfferId)
                .status(PipelineStatus.NEW)
                .internalNote(blankToNull(request.internalNote()))
                .createdAt(now)
                .updatedAt(now)
                .statusUpdatedAt(now)
                .build();
        try {
            talentPipelineRepository.saveAndFlush(entry);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "RECRUITMENT_ALREADY_EXISTS");
        }
        return toDto(entry, false);
    }

    @Transactional(readOnly = true)
    public List<RecruitmentDto> list(User viewer, UUID jobOfferId, Boolean direct, PipelineStatus status, String query) {
        if (permissionService.has(viewer, Permissions.HIRE_PIPELINE) && viewer.isOnboardingCompleted()) {
            if (jobOfferId != null) {
                jobOfferService.requireOwned(viewer.getId(), jobOfferId);
            }
            return mapRows(
                    talentPipelineRepository.findByEmployerIdOrderByUpdatedAtDesc(viewer.getId()),
                    jobOfferId,
                    direct,
                    status,
                    query,
                    false
            );
        }
        if (permissionService.has(viewer, Permissions.HIRE_APPLICATIONS_VIEW) && viewer.isOnboardingCompleted()) {
            return mapRows(
                    talentPipelineRepository.findByCandidateIdOrderByUpdatedAtDesc(viewer.getId()),
                    jobOfferId,
                    direct,
                    status,
                    query,
                    true
            );
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    @Transactional(readOnly = true)
    public RecruitmentDto get(User viewer, UUID id) {
        if (permissionService.has(viewer, Permissions.HIRE_PIPELINE) && viewer.isOnboardingCompleted()) {
            return toDto(requireOwned(viewer.getId(), id), false);
        }
        if (permissionService.has(viewer, Permissions.HIRE_APPLICATIONS_VIEW) && viewer.isOnboardingCompleted()) {
            TalentPipeline entry = talentPipelineRepository.findByIdAndCandidateId(id, viewer.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECRUITMENT_NOT_FOUND"));
            return toDto(entry, true);
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    @Transactional
    public RecruitmentDto apply(User candidate, UUID jobOfferId, ApplyOpportunityRequest request) {
        if (!candidate.isCandidate() || !candidate.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        permissionService.require(candidate, Permissions.HIRE_JOBS_APPLY);
        entitlementService.require(candidate, com.fitnessuplink.billing.Entitlements.APPLY);
        JobOffer offer = jobOfferRepository.findById(jobOfferId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND"));
        if (offer.getStatus() != JobOfferStatus.PUBLISHED
                || (offer.getExpiresAt() != null && offer.getExpiresAt().isBefore(Instant.now()))) {
            throw new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND");
        }
        User employer = userRepository.findById(offer.getEmployerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND"));
        if (!employer.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND");
        }
        if (alreadyExists(employer.getId(), candidate.getId(), offer.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "RECRUITMENT_ALREADY_EXISTS");
        }
        String letter = request == null ? null : blankToNull(request.coverLetter());
        if (letter != null && letter.length() > COVER_LETTER_MAX) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "COVER_LETTER_TOO_LONG");
        }
        UUID letterUpload = request == null ? null : request.coverLetterUploadId();
        if (letterUpload != null && !uploadService.belongsTo(candidate.getId(), letterUpload, COVER_LETTER_FIELD)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_COVER_LETTER");
        }
        Instant now = Instant.now();
        TalentPipeline entry = TalentPipeline.builder()
                .id(UUID.randomUUID())
                .employerId(employer.getId())
                .candidateId(candidate.getId())
                .jobOfferId(offer.getId())
                .status(PipelineStatus.APPLIED)
                .coverLetterText(letter)
                .coverLetterUploadId(letterUpload)
                .createdAt(now)
                .updatedAt(now)
                .statusUpdatedAt(now)
                .build();
        try {
            talentPipelineRepository.saveAndFlush(entry);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "RECRUITMENT_ALREADY_EXISTS");
        }
        notificationService.notify(
                employer.getId(),
                NotifyCategory.APPLICATION,
                "Nouvelle candidature",
                candidate.getDisplayName() + " a postulé pour « " + offer.getTitle() + " ».",
                "Ouvrir",
                "/applications"
        );
        return toDto(entry, true);
    }

    @Transactional(readOnly = true)
    public long inboxCount(User employer) {
        permissionService.require(employer, Permissions.HIRE_PIPELINE);
        return talentPipelineRepository.countByEmployerIdAndStatus(employer.getId(), PipelineStatus.APPLIED);
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload coverLetterFile(User viewer, UUID recruitmentId) {
        TalentPipeline entry = requireReadable(viewer, recruitmentId);
        if (entry.getCoverLetterUploadId() == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "COVER_LETTER_NOT_FOUND");
        }
        return uploadService.loadAny(entry.getCoverLetterUploadId());
    }

    @Transactional(readOnly = true)
    public List<RecruitmentMessageDto> messages(User viewer, UUID recruitmentId) {
        TalentPipeline entry = requireReadable(viewer, recruitmentId);
        Map<UUID, User> people = peopleOf(entry);
        return recruitmentMessageRepository.findByRecruitmentIdOrderByCreatedAtAsc(entry.getId()).stream()
                .map(row -> toMessage(row, viewer.getId(), people))
                .toList();
    }

    @Transactional
    public RecruitmentMessageDto sendMessage(User viewer, UUID recruitmentId, String raw, UUID uploadId) {
        hireAbuseGuard.checkMessage(viewer.getId());
        TalentPipeline entry = requireReadable(viewer, recruitmentId);
        if (viewer.getId().equals(entry.getEmployerId())) {
            entitlementService.require(viewer, com.fitnessuplink.billing.Entitlements.CONTACT);
        } else {
            entitlementService.require(viewer, com.fitnessuplink.billing.Entitlements.TALENT_MESSAGES);
        }
        if (uploadId != null) {
            entitlementService.require(viewer, com.fitnessuplink.billing.Entitlements.CHAT_FILES);
        }
        if (!messagingOpen(entry.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "MESSAGING_NOT_OPEN");
        }
        String body = raw == null ? "" : raw.trim();
        if (body.length() > MESSAGE_MAX) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_TOO_LONG");
        }
        if (uploadId != null && !uploadService.belongsTo(viewer.getId(), uploadId, HIRE_FILE_FIELD)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ATTACHMENT");
        }
        if (body.isEmpty() && uploadId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_MESSAGE");
        }
        RecruitmentMessage saved = recruitmentMessageRepository.save(RecruitmentMessage.builder()
                .id(UUID.randomUUID())
                .recruitmentId(entry.getId())
                .senderId(viewer.getId())
                .body(body.isEmpty() ? "Pièce jointe" : body)
                .uploadId(uploadId)
                .createdAt(Instant.now())
                .build());
        UUID otherId = viewer.getId().equals(entry.getEmployerId()) ? entry.getCandidateId() : entry.getEmployerId();
        String path = viewer.getId().equals(entry.getEmployerId()) ? "/app/applications" : "/applications";
        notificationService.notify(
                otherId,
                NotifyCategory.MESSAGE,
                "Nouveau message",
                viewer.getDisplayName() + " vous a écrit.",
                "Ouvrir",
                path
        );
        User other = peopleOf(entry).get(otherId);
        if (other != null) {
            String excerpt = body.length() > 180 ? body.substring(0, 180) + "…" : body;
            hireMailService.enqueueMessage(other, viewer, excerpt);
        }
        return toMessage(saved, viewer.getId(), peopleOf(entry));
    }

    @Transactional(readOnly = true)
    public List<RecruitmentConversationDto> conversations(User viewer) {
        List<RecruitmentDto> rows = list(viewer, null, null, null, null).stream()
                .filter(row -> messagingOpen(row.status()))
                .toList();
        if (rows.isEmpty()) {
            return List.of();
        }
        boolean employer = permissionService.has(viewer, Permissions.HIRE_PIPELINE);
        Map<UUID, RecruitmentMessage> lastByRecruitment = recruitmentMessageRepository
                .findByRecruitmentIdIn(rows.stream().map(RecruitmentDto::id).toList())
                .stream()
                .collect(Collectors.toMap(
                        RecruitmentMessage::getRecruitmentId,
                        row -> row,
                        (left, right) -> left.getCreatedAt().isAfter(right.getCreatedAt()) ? left : right
                ));
        return rows.stream()
                .map(row -> {
                    RecruitmentMessage last = lastByRecruitment.get(row.id());
                    String peer = employer
                            ? row.candidate().displayName()
                            : (row.employer() == null ? "Employeur" : row.employer().displayName());
                    String title = row.jobOffer() == null ? "Recrutement direct" : row.jobOffer().title();
                    Instant lastAt = last == null ? row.statusUpdatedAt() : last.getCreatedAt();
                    return new RecruitmentConversationDto(
                            row.id(),
                            peer,
                            title,
                            last == null ? null : last.getBody(),
                            lastAt,
                            last != null && last.getSenderId().equals(viewer.getId()),
                            row.status()
                    );
                })
                .sorted(Comparator.comparing(RecruitmentConversationDto::lastAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private Map<UUID, User> peopleOf(TalentPipeline entry) {
        return userRepository.findAllById(Set.of(entry.getEmployerId(), entry.getCandidateId())).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
    }

    private RecruitmentMessageDto toMessage(RecruitmentMessage row, UUID viewerId, Map<UUID, User> people) {
        User sender = people.get(row.getSenderId());
        return new RecruitmentMessageDto(
                row.getId(),
                row.getSenderId(),
                sender == null ? "Compte" : sender.getDisplayName(),
                row.getSenderId().equals(viewerId),
                row.getBody(),
                row.getCreatedAt(),
                fileRef(row.getUploadId())
        );
    }

    @Transactional(readOnly = true)
    public List<RecruitmentSummaryDto> summariesForCandidate(User employer, UUID candidateId) {
        if (!permissionService.has(employer, Permissions.HIRE_PIPELINE) || !employer.isOnboardingCompleted()) {
            return List.of();
        }
        return talentPipelineRepository.findByEmployerIdAndCandidateIdOrderByUpdatedAtDesc(employer.getId(), candidateId)
                .stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public RecruitmentDto updateStatus(User employer, UUID id, PipelineStatus status) {
        return updateStatus(employer, id, new UpdateRecruitmentStatusRequest(status, null, null, null));
    }

    @Transactional
    public RecruitmentDto updateStatus(User employer, UUID id, UpdateRecruitmentStatusRequest request) {
        permissionService.require(employer, Permissions.HIRE_PIPELINE);
        if (request != null && request.status() == PipelineStatus.CONTACTED) {
            entitlementService.require(employer, com.fitnessuplink.billing.Entitlements.CONTACT);
        }
        if (request != null && request.status() == PipelineStatus.INTERVIEW_SCHEDULED) {
            entitlementService.require(employer, com.fitnessuplink.billing.Entitlements.INTERVIEW);
        }
        if (request != null && request.status() != null && request.status() != PipelineStatus.CONTACTED) {
            entitlementService.require(employer, com.fitnessuplink.billing.Entitlements.PIPELINE);
        }
        PipelineStatus status = request == null ? null : request.status();
        if (status == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PIPELINE_STATUS");
        }
        if (status == PipelineStatus.CONTRACT_SENT) {
            throw new ApiException(HttpStatus.CONFLICT, "CONTRACT_REQUIRED");
        }
        TalentPipeline entry = requireOwned(employer.getId(), id);
        if (status == PipelineStatus.HIRED
                && !contractRepository.existsByRecruitmentIdAndStatus(entry.getId(), ContractStatus.COMPLETED)) {
            throw new ApiException(HttpStatus.CONFLICT, "CONTRACT_NOT_COMPLETED");
        }
        Instant now = Instant.now();
        PipelineStatus from = entry.getStatus();
        if (from != status && status == PipelineStatus.CONTACTED) {
            hireAbuseGuard.checkContact(employer.getId());
        }
        if (from != status) {
            assertTransition(from, status);
            if (from == PipelineStatus.CONTRACT_SENT
                    && status != PipelineStatus.HIRED
                    && status != PipelineStatus.ARCHIVED
                    && status != PipelineStatus.REJECTED) {
                cancelOpenContracts(entry.getId());
            }
            entry.setStatus(status);
            entry.setStatusUpdatedAt(now);
        }
        if (status == PipelineStatus.INTERVIEW_SCHEDULED) {
            applyInterview(entry, request);
        }
        entry.setUpdatedAt(now);
        RecruitmentDto dto = toDto(talentPipelineRepository.save(entry));
        if (from != status && status == PipelineStatus.CONTACTED) {
            notificationService.notify(
                    entry.getCandidateId(),
                    NotifyCategory.CONTACT,
                    "Vous êtes contacté",
                    employer.getDisplayName() + " souhaite échanger avec vous.",
                    "Ouvrir",
                    "/app/applications"
            );
            User candidate = userRepository.findById(entry.getCandidateId()).orElse(null);
            if (candidate != null) {
                String offer = dto.jobOffer() == null ? "un recrutement" : dto.jobOffer().title();
                hireMailService.enqueueContacted(candidate, employer, offer);
            }
        } else if (from != status && status == PipelineStatus.INTERVIEW_SCHEDULED) {
            notifyInterview(entry, employer, dto);
        } else if (from != status) {
            notificationService.notify(
                    entry.getCandidateId(),
                    NotifyCategory.CONTACT,
                    "Étape mise à jour",
                    employer.getDisplayName() + " a passé le dossier à « " + statusLabelFr(status) + " ».",
                    "Ouvrir",
                    "/app/applications"
            );
        }
        return dto;
    }

    @Transactional
    public void report(User viewer, UUID recruitmentId, String reason) {
        hireAbuseGuard.checkReport(viewer.getId());
        TalentPipeline entry = requireReadable(viewer, recruitmentId);
        String text = reason == null ? "" : reason.trim();
        if (text.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REPORT_REASON_REQUIRED");
        }
        hireReportRepository.save(HireReport.builder()
                .id(UUID.randomUUID())
                .recruitmentId(entry.getId())
                .reporterId(viewer.getId())
                .reason(text)
                .createdAt(Instant.now())
                .build());
        userRepository.findByAppRole_Code("SUPER_ADMIN").forEach(admin -> notificationService.notify(
                admin.getId(),
                "Signalement recrutement",
                viewer.getDisplayName() + " a signalé une discussion Hire.",
                "Ouvrir",
                "/admin/verifications"
        ));
    }

    @Transactional
    public FileRef uploadMessageFile(User viewer, UUID recruitmentId, MultipartFile file) {
        TalentPipeline entry = requireReadable(viewer, recruitmentId);
        if (!messagingOpen(entry.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "MESSAGING_NOT_OPEN");
        }
        UserUpload upload = uploadService.storeHireFile(viewer.getId(), file);
        return new FileRef(upload.getId(), upload.getOriginalFilename(), upload.getContentType(), upload.getSizeBytes());
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload messageFile(User viewer, UUID recruitmentId, UUID messageId) {
        TalentPipeline entry = requireReadable(viewer, recruitmentId);
        RecruitmentMessage row = recruitmentMessageRepository.findById(messageId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MESSAGE_NOT_FOUND"));
        if (!row.getRecruitmentId().equals(entry.getId()) || row.getUploadId() == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "ATTACHMENT_NOT_FOUND");
        }
        return uploadService.loadAny(row.getUploadId());
    }

    private void applyInterview(TalentPipeline entry, UpdateRecruitmentStatusRequest request) {
        Instant at = parseInterviewAt(request == null ? null : request.interviewAt());
        String mode = request == null || request.interviewMode() == null ? "" : request.interviewMode().trim().toUpperCase(Locale.ROOT);
        String place = request == null ? null : blankToNull(request.interviewPlace());
        if (at == null || (!"MEET".equals(mode) && !"ONSITE".equals(mode)) || place == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INTERVIEW_DETAILS_REQUIRED");
        }
        if ("MEET".equals(mode) && !place.startsWith("http")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INTERVIEW_MEET_LINK_REQUIRED");
        }
        entry.setInterviewAt(at);
        entry.setInterviewMode(mode);
        entry.setInterviewPlace(place);
    }

    private Instant parseInterviewAt(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(raw);
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDateTime.parse(raw).atZone(INTERVIEW_ZONE).toInstant();
            } catch (DateTimeParseException ex) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INTERVIEW_DETAILS_REQUIRED");
            }
        }
    }

    private void notifyInterview(TalentPipeline entry, User employer, RecruitmentDto dto) {
        User candidate = userRepository.findById(entry.getCandidateId()).orElse(null);
        if (candidate == null || entry.getInterviewAt() == null) {
            return;
        }
        boolean meet = "MEET".equals(entry.getInterviewMode());
        String modeLabel = meet ? "Visioconférence" : "Présentiel";
        notificationService.notify(
                candidate.getId(),
                NotifyCategory.CONTACT,
                "Entretien prévu",
                employer.getDisplayName() + " : " + INTERVIEW_DAY.format(entry.getInterviewAt()) + " à " + INTERVIEW_HOUR.format(entry.getInterviewAt()),
                "Ouvrir",
                "/app/applications"
        );
        hireMailService.enqueueInterview(
                candidate,
                employer,
                dto.jobOffer() == null ? "un recrutement" : dto.jobOffer().title(),
                INTERVIEW_DAY.format(entry.getInterviewAt()),
                INTERVIEW_HOUR.format(entry.getInterviewAt()),
                modeLabel,
                meet ? "Lien" : "Adresse",
                entry.getInterviewPlace()
        );
    }

    @Transactional
    public RecruitmentDto markContractSent(User employer, UUID recruitmentId) {
        permissionService.require(employer, Permissions.HIRE_PIPELINE);
        TalentPipeline entry = requireOwned(employer.getId(), recruitmentId);
        if (entry.getStatus() != PipelineStatus.NEGOTIATION && entry.getStatus() != PipelineStatus.CONTRACT_SENT) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_RECRUITMENT_TRANSITION");
        }
        Instant now = Instant.now();
        if (entry.getStatus() != PipelineStatus.CONTRACT_SENT) {
            entry.setStatus(PipelineStatus.CONTRACT_SENT);
            entry.setStatusUpdatedAt(now);
        }
        entry.setUpdatedAt(now);
        return toDto(talentPipelineRepository.save(entry));
    }

    @Transactional
    public RecruitmentDto updateNote(User employer, UUID id, String note) {
        permissionService.require(employer, Permissions.HIRE_PIPELINE);
        TalentPipeline entry = requireOwned(employer.getId(), id);
        entry.setInternalNote(blankToNull(note));
        entry.setUpdatedAt(Instant.now());
        return toDto(talentPipelineRepository.save(entry));
    }

    @Transactional
    public RecruitmentDto archive(User employer, UUID id) {
        return updateStatus(employer, id, PipelineStatus.ARCHIVED);
    }

    @Transactional
    public RecruitmentDto block(User viewer, UUID id) {
        TalentPipeline entry = requireReadable(viewer, id);
        Instant now = Instant.now();
        entry.setStatus(PipelineStatus.REJECTED);
        entry.setStatusUpdatedAt(now);
        entry.setUpdatedAt(now);
        RecruitmentDto dto = toDto(talentPipelineRepository.save(entry));
        UUID otherId = viewer.getId().equals(entry.getEmployerId()) ? entry.getCandidateId() : entry.getEmployerId();
        notificationService.notify(
                otherId,
                NotifyCategory.CONTACT,
                "Contact refusé",
                viewer.getDisplayName() + " a bloqué cette discussion.",
                "Ouvrir",
                viewer.getId().equals(entry.getEmployerId()) ? "/app/applications" : "/applications"
        );
        return dto;
    }

    private boolean alreadyExists(UUID employerId, UUID candidateId, UUID jobOfferId) {
        if (jobOfferId == null) {
            return talentPipelineRepository.existsByEmployerIdAndCandidateIdAndJobOfferIdIsNull(employerId, candidateId);
        }
        return talentPipelineRepository.existsByEmployerIdAndCandidateIdAndJobOfferId(employerId, candidateId, jobOfferId);
    }

    private TalentPipeline requireOwned(UUID employerId, UUID id) {
        return talentPipelineRepository.findByIdAndEmployerId(id, employerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECRUITMENT_NOT_FOUND"));
    }

    private User requireCandidate(UUID candidateId) {
        User candidate = userRepository.findById(candidateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CANDIDATE_NOT_FOUND"));
        if (!candidate.isCandidate() || !candidate.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CANDIDATE_NOT_FOUND");
        }
        return candidate;
    }

    private RecruitmentDto toDto(TalentPipeline entry) {
        return toDto(entry, false);
    }

    private RecruitmentDto toDto(TalentPipeline entry, boolean hideInternalNote) {
        User candidate = requireCandidate(entry.getCandidateId());
        User employer = userRepository.findById(entry.getEmployerId()).orElse(null);
        JobOffer offer = entry.getJobOfferId() == null ? null : jobOfferRepository.findById(entry.getJobOfferId()).orElse(null);
        Map<UUID, Map<String, String>> values = valuesOf(employer == null
                ? Set.of(candidate.getId())
                : Set.of(candidate.getId(), employer.getId()));
        return toDto(
                entry,
                candidate,
                employer,
                offer,
                values.getOrDefault(candidate.getId(), Map.of()),
                employer == null ? Map.of() : values.getOrDefault(employer.getId(), Map.of()),
                contractSummary(entry.getId()),
                hideInternalNote
        );
    }

    private List<RecruitmentDto> mapRows(
            List<TalentPipeline> rows,
            UUID jobOfferId,
            Boolean direct,
            PipelineStatus status,
            String query,
            boolean hideInternalNote
    ) {
        String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        Set<UUID> candidateIds = rows.stream().map(TalentPipeline::getCandidateId).collect(Collectors.toSet());
        Set<UUID> employerIds = rows.stream().map(TalentPipeline::getEmployerId).collect(Collectors.toSet());
        Set<UUID> peopleIds = new java.util.HashSet<>();
        peopleIds.addAll(candidateIds);
        peopleIds.addAll(employerIds);
        Map<UUID, User> people = userRepository.findAllById(peopleIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Map<UUID, Map<String, String>> valuesByUser = valuesOf(peopleIds);
        Map<UUID, JobOffer> offers = jobOfferRepository.findAllById(
                rows.stream().map(TalentPipeline::getJobOfferId).filter(Objects::nonNull).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(JobOffer::getId, offer -> offer));
        Map<UUID, ContractSummaryDto> contracts = latestContracts(
                rows.stream().map(TalentPipeline::getId).toList()
        );

        return rows.stream()
                .filter(row -> jobOfferId == null || jobOfferId.equals(row.getJobOfferId()))
                .filter(row -> direct == null || Boolean.TRUE.equals(direct) == (row.getJobOfferId() == null))
                .filter(row -> status == null || status == row.getStatus())
                .map(row -> {
                    User candidate = people.get(row.getCandidateId());
                    if (candidate == null) {
                        return null;
                    }
                    RecruitmentDto dto = toDto(
                            row,
                            candidate,
                            people.get(row.getEmployerId()),
                            row.getJobOfferId() == null ? null : offers.get(row.getJobOfferId()),
                            valuesByUser.getOrDefault(candidate.getId(), Map.of()),
                            valuesByUser.getOrDefault(row.getEmployerId(), Map.of()),
                            contracts.get(row.getId()),
                            hideInternalNote
                    );
                    if (!needle.isBlank() && !matches(dto, needle)) {
                        return null;
                    }
                    return dto;
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private RecruitmentDto toDto(
            TalentPipeline entry,
            User candidate,
            User employer,
            JobOffer offer,
            Map<String, String> candidateValues,
            Map<String, String> employerValues,
            ContractSummaryDto contract,
            boolean hideInternalNote
    ) {
        return new RecruitmentDto(
                entry.getId(),
                toCandidate(candidate, candidateValues),
                toEmployer(employer, employerValues),
                offer == null ? null : jobOfferService.toSummary(offer),
                entry.getJobOfferId() == null,
                entry.getStatus(),
                hideInternalNote ? null : entry.getInternalNote(),
                entry.getCreatedAt(),
                entry.getUpdatedAt(),
                entry.getStatusUpdatedAt(),
                contract,
                entry.getCoverLetterText(),
                fileRef(entry.getCoverLetterUploadId()),
                firstFile(candidateValues.get("cv")),
                entry.getInterviewAt(),
                entry.getInterviewMode(),
                entry.getInterviewPlace()
        );
    }

    private RecruitmentEmployerDto toEmployer(User employer, Map<String, String> values) {
        if (employer == null) {
            return null;
        }
        return new RecruitmentEmployerDto(
                employer.getId(),
                organizationName(employer, values),
                countryOf(employer)
        );
    }

    private String organizationName(User employer, Map<String, String> values) {
        for (String key : List.of("trade_name", "legal_name", "company_name", "gym_name", "academy_name", "organization_name")) {
            String value = text(values, key);
            if (value != null) {
                return value;
            }
        }
        return employer.getDisplayName();
    }

    private RecruitmentSummaryDto toSummary(TalentPipeline entry) {
        JobOfferSummaryDto offer = null;
        if (entry.getJobOfferId() != null) {
            offer = jobOfferRepository.findById(entry.getJobOfferId())
                    .map(jobOfferService::toSummary)
                    .orElse(null);
        }
        return new RecruitmentSummaryDto(
                entry.getId(),
                entry.getStatus(),
                offer,
                entry.getJobOfferId() == null,
                entry.getCreatedAt(),
                entry.getStatusUpdatedAt()
        );
    }

    private RecruitmentCandidateDto toCandidate(User candidate, Map<String, String> values) {
        return new RecruitmentCandidateDto(
                candidate.getId(),
                candidate.getFirstName(),
                candidate.getLastName(),
                candidate.getDisplayName(),
                text(values, "professional_title"),
                text(values, "city"),
                countryOf(candidate),
                firstUploadId(values.get("professional_photo")),
                candidate.isVerified(),
                null
        );
    }

    private static String statusLabelFr(PipelineStatus status) {
        return switch (status) {
            case APPLIED -> "Candidature reçue";
            case NEW -> "Nouveau";
            case CONTACTED -> "Contacté";
            case INTERVIEW_SCHEDULED -> "Entretien prévu";
            case NEGOTIATION -> "En négociation";
            case CONTRACT_SENT -> "Contrat envoyé";
            case HIRED -> "Recruté";
            case REJECTED -> "Refusé";
            case ARCHIVED -> "Archivé";
        };
    }

    private boolean messagingOpen(PipelineStatus status) {
        return status != PipelineStatus.APPLIED
                && status != PipelineStatus.NEW
                && status != PipelineStatus.REJECTED
                && status != PipelineStatus.ARCHIVED;
    }

    private TalentPipeline requireReadable(User viewer, UUID id) {
        if (permissionService.has(viewer, Permissions.HIRE_PIPELINE) && viewer.isOnboardingCompleted()) {
            return requireOwned(viewer.getId(), id);
        }
        if (permissionService.has(viewer, Permissions.HIRE_APPLICATIONS_VIEW) && viewer.isOnboardingCompleted()) {
            return talentPipelineRepository.findByIdAndCandidateId(id, viewer.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECRUITMENT_NOT_FOUND"));
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    private void assertTransition(PipelineStatus from, PipelineStatus to) {
        if (from == to) {
            return;
        }
        if (from == PipelineStatus.APPLIED && (to == PipelineStatus.NEW || to == PipelineStatus.CONTACTED || to == PipelineStatus.REJECTED)) {
            return;
        }
        if (from == PipelineStatus.APPLIED) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_RECRUITMENT_TRANSITION");
        }
        if (to == PipelineStatus.REJECTED || to == PipelineStatus.ARCHIVED) {
            return;
        }
        Set<PipelineStatus> working = EnumSet.of(
                PipelineStatus.NEW,
                PipelineStatus.CONTACTED,
                PipelineStatus.INTERVIEW_SCHEDULED,
                PipelineStatus.NEGOTIATION
        );
        if (working.contains(from) && working.contains(to)) {
            return;
        }
        if (from == PipelineStatus.CONTRACT_SENT && (working.contains(to) || to == PipelineStatus.HIRED)) {
            return;
        }
        throw new ApiException(HttpStatus.CONFLICT, "INVALID_RECRUITMENT_TRANSITION");
    }

    private void cancelOpenContracts(UUID recruitmentId) {
        Instant now = Instant.now();
        for (Contract contract : contractRepository.findByRecruitmentIdOrderByCreatedAtDesc(recruitmentId)) {
            if (contract.getStatus() == ContractStatus.COMPLETED
                    || contract.getStatus() == ContractStatus.CANCELLED
                    || contract.getStatus() == ContractStatus.DECLINED
                    || contract.getStatus() == ContractStatus.EXPIRED) {
                continue;
            }
            contract.setStatus(ContractStatus.CANCELLED);
            contract.setUpdatedAt(now);
            contractRepository.save(contract);
        }
    }

    private Map<UUID, ContractSummaryDto> latestContracts(List<UUID> recruitmentIds) {
        if (recruitmentIds.isEmpty()) {
            return Map.of();
        }
        return contractRepository.findByRecruitmentIdIn(recruitmentIds).stream()
                .collect(Collectors.groupingBy(Contract::getRecruitmentId))
                .entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> toSummary(entry.getValue().stream()
                                .max(Comparator.comparing(Contract::getCreatedAt))
                                .orElseThrow())
                ));
    }

    private ContractSummaryDto contractSummary(UUID recruitmentId) {
        return contractRepository.findByRecruitmentIdOrderByCreatedAtDesc(recruitmentId).stream()
                .findFirst()
                .map(this::toSummary)
                .orElse(null);
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

    private boolean matches(RecruitmentDto dto, String needle) {
        RecruitmentCandidateDto candidate = dto.candidate();
        String haystack = String.join(" ",
                nullToEmpty(candidate.displayName()),
                nullToEmpty(candidate.title()),
                nullToEmpty(candidate.city()),
                candidate.country() == null ? "" : candidate.country().name(),
                dto.employer() == null ? "" : nullToEmpty(dto.employer().displayName()),
                dto.jobOffer() == null ? "recrutement direct" : nullToEmpty(dto.jobOffer().title())
        ).toLowerCase(Locale.ROOT);
        return haystack.contains(needle);
    }

    private Map<UUID, Map<String, String>> valuesOf(Set<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return userProfileValueRepository.findByUserIdIn(userIds).stream()
                .filter(item -> item.getValue() != null)
                .collect(Collectors.groupingBy(
                        UserProfileValue::getUserId,
                        Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (left, right) -> left)
                ));
    }

    private CountrySummary countryOf(User user) {
        if (user.getCountry() == null) {
            return null;
        }
        return new CountrySummary(
                user.getCountry().getId(),
                user.getCountry().getIso2(),
                user.getCountry().getName(),
                user.getCountry().getFlagEmoji(),
                user.getCountry().getCallingCode()
        );
    }

    private String text(Map<String, String> values, String key) {
        String value = values.get(key);
        return value == null || value.isBlank() ? null : value;
    }

    private FileRef fileRef(UUID uploadId) {
        if (uploadId == null) {
            return null;
        }
        try {
            UserUpload upload = uploadService.loadAny(uploadId).upload();
            return new FileRef(upload.getId(), upload.getOriginalFilename(), upload.getContentType(), upload.getSizeBytes());
        } catch (RuntimeException ex) {
            return new FileRef(uploadId, "Lettre de motivation", "application/pdf", 0);
        }
    }

    private FileRef firstFile(String json) {
        UUID id = firstUploadId(json);
        return id == null ? null : fileRef(id);
    }

    private UUID firstUploadId(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        Matcher matcher = UPLOAD_ID.matcher(json);
        if (!matcher.find()) {
            return null;
        }
        try {
            return UUID.fromString(matcher.group(1));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
