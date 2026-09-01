package com.fitnessuplink.talent;

import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.jobs.JobOffer;
import com.fitnessuplink.jobs.JobOfferRepository;
import com.fitnessuplink.jobs.JobOfferService;
import com.fitnessuplink.jobs.dto.JobOfferSummaryDto;
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

    @Transactional
    public RecruitmentDto create(User employer, CreateRecruitmentRequest request) {
        JobOfferService.requireEmployer(employer);
        User candidate = requireCandidate(request.candidateId());
        UUID jobOfferId = request.jobOfferId();
        JobOffer offer = null;
        if (jobOfferId != null) {
            offer = jobOfferService.requireOwned(employer.getId(), jobOfferId);
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
        return toDto(entry, candidate, offer);
    }

    @Transactional(readOnly = true)
    public List<RecruitmentDto> list(User employer, UUID jobOfferId, Boolean direct, PipelineStatus status, String query) {
        JobOfferService.requireEmployer(employer);
        if (jobOfferId != null) {
            jobOfferService.requireOwned(employer.getId(), jobOfferId);
        }
        String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        List<TalentPipeline> rows = talentPipelineRepository.findByEmployerIdOrderByUpdatedAtDesc(employer.getId());
        Set<UUID> candidateIds = rows.stream().map(TalentPipeline::getCandidateId).collect(Collectors.toSet());
        Map<UUID, User> candidates = userRepository.findAllById(candidateIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Map<UUID, Map<String, String>> valuesByUser = valuesOf(candidateIds);
        Map<UUID, JobOffer> offers = jobOfferRepository.findAllById(
                rows.stream().map(TalentPipeline::getJobOfferId).filter(Objects::nonNull).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(JobOffer::getId, offer -> offer));

        return rows.stream()
                .filter(row -> jobOfferId == null || jobOfferId.equals(row.getJobOfferId()))
                .filter(row -> direct == null || Boolean.TRUE.equals(direct) == (row.getJobOfferId() == null))
                .filter(row -> status == null || status == row.getStatus())
                .map(row -> {
                    User candidate = candidates.get(row.getCandidateId());
                    if (candidate == null) {
                        return null;
                    }
                    RecruitmentDto dto = toDto(
                            row,
                            candidate,
                            row.getJobOfferId() == null ? null : offers.get(row.getJobOfferId()),
                            valuesByUser.getOrDefault(candidate.getId(), Map.of())
                    );
                    if (!needle.isBlank() && !matches(dto, needle)) {
                        return null;
                    }
                    return dto;
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public RecruitmentDto get(User employer, UUID id) {
        JobOfferService.requireEmployer(employer);
        TalentPipeline entry = requireOwned(employer.getId(), id);
        return toDto(entry);
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
        TalentPipeline entry = requireOwned(employer.getId(), id);
        Instant now = Instant.now();
        if (entry.getStatus() != status) {
            entry.setStatus(status);
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
        User candidate = requireCandidate(entry.getCandidateId());
        JobOffer offer = entry.getJobOfferId() == null ? null : jobOfferRepository.findById(entry.getJobOfferId()).orElse(null);
        return toDto(entry, candidate, offer);
    }

    private RecruitmentDto toDto(TalentPipeline entry, User candidate, JobOffer offer) {
        return toDto(entry, candidate, offer, valuesOf(Set.of(candidate.getId())).getOrDefault(candidate.getId(), Map.of()));
    }

    private RecruitmentDto toDto(TalentPipeline entry, User candidate, JobOffer offer, Map<String, String> values) {
        return new RecruitmentDto(
                entry.getId(),
                toCandidate(candidate, values),
                offer == null ? null : jobOfferService.toSummary(offer),
                entry.getJobOfferId() == null,
                entry.getStatus(),
                entry.getInternalNote(),
                entry.getCreatedAt(),
                entry.getUpdatedAt(),
                entry.getStatusUpdatedAt()
        );
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

    private boolean matches(RecruitmentDto dto, String needle) {
        RecruitmentCandidateDto candidate = dto.candidate();
        String haystack = String.join(" ",
                nullToEmpty(candidate.displayName()),
                nullToEmpty(candidate.title()),
                nullToEmpty(candidate.city()),
                candidate.country() == null ? "" : candidate.country().name(),
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
