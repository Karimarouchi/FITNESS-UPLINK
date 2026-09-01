package com.fitnessuplink.jobs;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.jobs.dto.JobOfferDto;
import com.fitnessuplink.jobs.dto.JobOfferSummaryDto;
import com.fitnessuplink.jobs.dto.UpsertJobOfferRequest;
import com.fitnessuplink.talent.TalentPipelineRepository;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobOfferService {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private final JobOfferRepository jobOfferRepository;
    private final TalentPipelineRepository talentPipelineRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<JobOfferDto> list(User employer) {
        requireEmployer(employer);
        return jobOfferRepository.findByEmployerIdOrderByUpdatedAtDesc(employer.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public JobOfferDto get(User employer, UUID id) {
        requireEmployer(employer);
        return toDto(requireOwned(employer.getId(), id));
    }

    @Transactional
    public JobOfferDto create(User employer, UpsertJobOfferRequest request) {
        requireEmployer(employer);
        Instant now = Instant.now();
        JobOffer offer = JobOffer.builder()
                .id(UUID.randomUUID())
                .employerId(employer.getId())
                .createdAt(now)
                .updatedAt(now)
                .build();
        apply(offer, request);
        return toDto(jobOfferRepository.save(offer));
    }

    @Transactional
    public JobOfferDto update(User employer, UUID id, UpsertJobOfferRequest request) {
        requireEmployer(employer);
        JobOffer offer = requireOwned(employer.getId(), id);
        apply(offer, request);
        offer.setUpdatedAt(Instant.now());
        return toDto(jobOfferRepository.save(offer));
    }

    @Transactional
    public void delete(User employer, UUID id) {
        requireEmployer(employer);
        JobOffer offer = requireOwned(employer.getId(), id);
        if (talentPipelineRepository.countByJobOfferId(offer.getId()) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "JOB_OFFER_IN_USE");
        }
        jobOfferRepository.delete(offer);
    }

    public JobOffer requireOwned(UUID employerId, UUID offerId) {
        return jobOfferRepository.findByIdAndEmployerId(offerId, employerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JOB_OFFER_NOT_FOUND"));
    }

    public JobOfferSummaryDto toSummary(JobOffer offer) {
        return new JobOfferSummaryDto(offer.getId(), offer.getTitle(), offer.getPosition(), offer.getLocation());
    }

    public static void requireEmployer(User user) {
        if (user == null || !user.isBusiness() || !user.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
    }

    private void apply(JobOffer offer, UpsertJobOfferRequest request) {
        offer.setTitle(request.title().trim());
        offer.setPosition(blankToNull(request.position()));
        offer.setLocation(blankToNull(request.location()));
        offer.setContractType(blankToNull(request.contractType()));
        offer.setSalaryAmount(blankToNull(request.salaryAmount()));
        offer.setSalaryCurrency(blankToNull(request.salaryCurrency()));
        offer.setLanguages(writeList(request.languages()));
        offer.setCertifications(writeList(request.certifications()));
        offer.setExperience(blankToNull(request.experience()));
        offer.setDescription(blankToNull(request.description()));
        offer.setStatus(request.status() == null ? JobOfferStatus.DRAFT : request.status());
        offer.setExpiresAt(request.expiresAt());
    }

    private JobOfferDto toDto(JobOffer offer) {
        return new JobOfferDto(
                offer.getId(),
                offer.getTitle(),
                offer.getPosition(),
                offer.getLocation(),
                offer.getContractType(),
                offer.getSalaryAmount(),
                offer.getSalaryCurrency(),
                readList(offer.getLanguages()),
                readList(offer.getCertifications()),
                offer.getExperience(),
                offer.getDescription(),
                offer.getStatus(),
                offer.getExpiresAt(),
                offer.getCreatedAt(),
                offer.getUpdatedAt()
        );
    }

    private List<String> readList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> items = objectMapper.readValue(json, STRING_LIST);
            return items == null ? List.of() : items.stream().filter(item -> item != null && !item.isBlank()).toList();
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String writeList(List<String> items) {
        if (items == null || items.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(items.stream()
                    .filter(item -> item != null && !item.isBlank())
                    .map(String::trim)
                    .toList());
        } catch (Exception ex) {
            return null;
        }
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
