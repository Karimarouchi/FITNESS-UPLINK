package com.fitnessuplink.talent;

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
import com.fitnessuplink.talent.dto.RecruitmentEmployerDto;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.talent.dto.CreateRecruitmentRequest;
import com.fitnessuplink.talent.dto.RecruitmentCandidateDto;
import com.fitnessuplink.talent.dto.RecruitmentDto;
import com.fitnessuplink.talent.dto.RecruitmentSummaryDto;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.dto.CountrySummary;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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

    private final TalentPipelineRepository talentPipelineRepository;
    private final JobOfferRepository jobOfferRepository;
    private final JobOfferService jobOfferService;
    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final ContractRepository contractRepository;

    @Transactional
    public RecruitmentDto create(User employer, CreateRecruitmentRequest request) {
        JobOfferService.requireEmployer(employer);
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
        if (viewer.isBusiness() && viewer.isOnboardingCompleted()) {
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
        if (viewer.isCandidate() && viewer.isOnboardingCompleted()) {
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
        if (viewer.isBusiness() && viewer.isOnboardingCompleted()) {
            return toDto(requireOwned(viewer.getId(), id), false);
        }
        if (viewer.isCandidate() && viewer.isOnboardingCompleted()) {
            TalentPipeline entry = talentPipelineRepository.findByIdAndCandidateId(id, viewer.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECRUITMENT_NOT_FOUND"));
            return toDto(entry, true);
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    @Transactional
    public RecruitmentDto apply(User candidate, UUID jobOfferId) {
        if (!candidate.isCandidate() || !candidate.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        JobOffer offer = jobOfferRepository.findById(jobOfferId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND"));
        if (offer.getStatus() != JobOfferStatus.PUBLISHED
                || (offer.getExpiresAt() != null && offer.getExpiresAt().isBefore(Instant.now()))) {
            throw new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND");
        }
        User employer = userRepository.findById(offer.getEmployerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND"));
        if (!employer.isBusiness() || !employer.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND");
        }
        if (alreadyExists(employer.getId(), candidate.getId(), offer.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "RECRUITMENT_ALREADY_EXISTS");
        }
        Instant now = Instant.now();
        TalentPipeline entry = TalentPipeline.builder()
                .id(UUID.randomUUID())
                .employerId(employer.getId())
                .candidateId(candidate.getId())
                .jobOfferId(offer.getId())
                .status(PipelineStatus.NEW)
                .createdAt(now)
                .updatedAt(now)
                .statusUpdatedAt(now)
                .build();
        try {
            talentPipelineRepository.saveAndFlush(entry);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "RECRUITMENT_ALREADY_EXISTS");
        }
        return toDto(entry, true);
    }

    @Transactional(readOnly = true)
    public List<RecruitmentSummaryDto> summariesForCandidate(User employer, UUID candidateId) {
        if (!employer.isBusiness() || !employer.isOnboardingCompleted()) {
            return List.of();
        }
        return talentPipelineRepository.findByEmployerIdAndCandidateIdOrderByUpdatedAtDesc(employer.getId(), candidateId)
                .stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public RecruitmentDto updateStatus(User employer, UUID id, PipelineStatus status) {
        JobOfferService.requireEmployer(employer);
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
        if (entry.getStatus() != status) {
            assertTransition(entry.getStatus(), status);
            if (entry.getStatus() == PipelineStatus.CONTRACT_SENT
                    && status != PipelineStatus.HIRED
                    && status != PipelineStatus.ARCHIVED
                    && status != PipelineStatus.REJECTED) {
                cancelOpenContracts(entry.getId());
            }
            entry.setStatus(status);
            entry.setStatusUpdatedAt(now);
        }
        entry.setUpdatedAt(now);
        return toDto(talentPipelineRepository.save(entry));
    }

    @Transactional
    public RecruitmentDto markContractSent(User employer, UUID recruitmentId) {
        JobOfferService.requireEmployer(employer);
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
        JobOfferService.requireEmployer(employer);
        TalentPipeline entry = requireOwned(employer.getId(), id);
        entry.setInternalNote(blankToNull(note));
        entry.setUpdatedAt(Instant.now());
        return toDto(talentPipelineRepository.save(entry));
    }

    @Transactional
    public RecruitmentDto archive(User employer, UUID id) {
        return updateStatus(employer, id, PipelineStatus.ARCHIVED);
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
                contract
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
                candidate.getEmail()
        );
    }

    private void assertTransition(PipelineStatus from, PipelineStatus to) {
        if (from == to) {
            return;
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
