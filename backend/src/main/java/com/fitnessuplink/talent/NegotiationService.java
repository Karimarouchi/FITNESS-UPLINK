package com.fitnessuplink.talent;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Back-and-forth proposals of contract terms between an employer and a candidate. */
@Service
@RequiredArgsConstructor
public class NegotiationService {

    public static final String PROPOSED = "PROPOSED";
    public static final String ACCEPTED = "ACCEPTED";
    public static final String DECLINED = "DECLINED";
    public static final String SUPERSEDED = "SUPERSEDED";

    private static final Set<String> CONTRACT_TYPES = Set.of("cdi", "cdd", "freelance", "part_time", "internship", "vacation");
    private static final int MAX_OFFERS = 30;

    public record OfferRequest(
            BigDecimal salaryAmount,
            String salaryCurrency,
            String contractType,
            LocalDate startDate,
            String location,
            String note
    ) {
    }

    public record OfferDto(
            UUID id,
            String proposerName,
            String proposerRole,
            boolean mine,
            BigDecimal salaryAmount,
            String salaryCurrency,
            String contractType,
            LocalDate startDate,
            String location,
            String note,
            String status,
            Instant createdAt,
            Instant respondedAt
    ) {
    }

    private final NegotiationOfferRepository offerRepository;
    private final TalentPipelineRepository pipelineRepository;
    private final PermissionService permissionService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<OfferDto> list(User viewer, UUID recruitmentId) {
        TalentPipeline entry = requireParticipant(viewer, recruitmentId);
        return offerRepository.findByRecruitmentIdOrderByCreatedAtAsc(entry.getId()).stream()
                .map(offer -> toDto(offer, viewer, entry))
                .toList();
    }

    @Transactional
    public OfferDto propose(User viewer, UUID recruitmentId, OfferRequest request) {
        TalentPipeline entry = requireParticipant(viewer, recruitmentId);
        if (entry.getStatus() != PipelineStatus.NEGOTIATION) {
            throw new ApiException(HttpStatus.CONFLICT, "NEGOTIATION_NOT_OPEN");
        }
        if (offerRepository.countByRecruitmentId(entry.getId()) >= MAX_OFFERS) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "NEGOTIATION_LIMIT");
        }
        BigDecimal salary = request == null ? null : request.salaryAmount();
        if (salary == null || salary.signum() <= 0 || salary.compareTo(new BigDecimal("1000000000")) >= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NEGOTIATION_SALARY_INVALID");
        }
        String currency = request.salaryCurrency() == null ? "" : request.salaryCurrency().trim().toUpperCase(Locale.ROOT);
        if (currency.length() != 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NEGOTIATION_CURRENCY_INVALID");
        }
        String type = request.contractType() == null ? "" : request.contractType().trim().toLowerCase(Locale.ROOT);
        if (!CONTRACT_TYPES.contains(type)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NEGOTIATION_CONTRACT_INVALID");
        }
        if (request.startDate() != null && request.startDate().isBefore(LocalDate.now().minusDays(1))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NEGOTIATION_DATE_INVALID");
        }
        String note = clean(request.note(), 1000);
        Instant now = Instant.now();

        // A new proposal replaces whatever was still waiting for an answer.
        for (NegotiationOffer open : offerRepository.findByRecruitmentIdAndStatus(entry.getId(), PROPOSED)) {
            open.setStatus(SUPERSEDED);
            open.setRespondedAt(now);
            offerRepository.save(open);
        }
        NegotiationOffer saved = offerRepository.save(NegotiationOffer.builder()
                .id(UUID.randomUUID())
                .recruitmentId(entry.getId())
                .proposerId(viewer.getId())
                .salaryAmount(salary)
                .salaryCurrency(currency)
                .contractType(type)
                .startDate(request.startDate())
                .location(clean(request.location(), 160))
                .note(note)
                .status(PROPOSED)
                .createdAt(now)
                .build());
        notifyOther(entry, viewer, "Nouvelle proposition",
                viewer.getDisplayName() + " vous a envoyé une proposition : " + salary.stripTrailingZeros().toPlainString() + " " + currency + ".");
        return toDto(saved, viewer, entry);
    }

    @Transactional
    public OfferDto respond(User viewer, UUID recruitmentId, UUID offerId, boolean accept) {
        TalentPipeline entry = requireParticipant(viewer, recruitmentId);
        NegotiationOffer offer = offerRepository.findByIdAndRecruitmentId(offerId, entry.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NEGOTIATION_OFFER_NOT_FOUND"));
        if (!PROPOSED.equals(offer.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "NEGOTIATION_OFFER_CLOSED");
        }
        if (offer.getProposerId().equals(viewer.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "NEGOTIATION_OWN_OFFER");
        }
        if (entry.getStatus() != PipelineStatus.NEGOTIATION) {
            throw new ApiException(HttpStatus.CONFLICT, "NEGOTIATION_NOT_OPEN");
        }
        offer.setStatus(accept ? ACCEPTED : DECLINED);
        offer.setRespondedAt(Instant.now());
        NegotiationOffer saved = offerRepository.save(offer);
        notifyOther(entry, viewer, accept ? "Proposition acceptée" : "Proposition refusée",
                viewer.getDisplayName() + (accept ? " a accepté votre proposition." : " a refusé votre proposition."));
        return toDto(saved, viewer, entry);
    }

    private TalentPipeline requireParticipant(User viewer, UUID recruitmentId) {
        if (permissionService.has(viewer, Permissions.HIRE_PIPELINE) && viewer.isOnboardingCompleted()) {
            return pipelineRepository.findByIdAndEmployerId(recruitmentId, viewer.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECRUITMENT_NOT_FOUND"));
        }
        if (permissionService.has(viewer, Permissions.HIRE_APPLICATIONS_VIEW) && viewer.isOnboardingCompleted()) {
            return pipelineRepository.findByIdAndCandidateId(recruitmentId, viewer.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECRUITMENT_NOT_FOUND"));
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    private void notifyOther(TalentPipeline entry, User viewer, String title, String message) {
        boolean employerActing = viewer.getId().equals(entry.getEmployerId());
        UUID otherId = employerActing ? entry.getCandidateId() : entry.getEmployerId();
        notificationService.notify(
                otherId,
                NotifyCategory.CONTACT,
                title,
                message,
                "Ouvrir",
                employerActing ? "/app/applications" : "/applications"
        );
    }

    private OfferDto toDto(NegotiationOffer offer, User viewer, TalentPipeline entry) {
        String name = userRepository.findById(offer.getProposerId()).map(User::getDisplayName).orElse("—");
        return new OfferDto(
                offer.getId(),
                name,
                offer.getProposerId().equals(entry.getEmployerId()) ? "EMPLOYER" : "CANDIDATE",
                offer.getProposerId().equals(viewer.getId()),
                offer.getSalaryAmount(),
                offer.getSalaryCurrency(),
                offer.getContractType(),
                offer.getStartDate(),
                offer.getLocation(),
                offer.getNote(),
                offer.getStatus(),
                offer.getCreatedAt(),
                offer.getRespondedAt()
        );
    }

    private static String clean(String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() > max) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NEGOTIATION_TEXT_TOO_LONG");
        }
        return trimmed;
    }
}
