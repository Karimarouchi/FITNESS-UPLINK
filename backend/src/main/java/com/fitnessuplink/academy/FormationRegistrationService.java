package com.fitnessuplink.academy;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.academy.dto.AcademyDtos.PayRegistrationRequest;
import com.fitnessuplink.academy.dto.AcademyDtos.RegistrationDto;
import com.fitnessuplink.billing.ChargeResult;
import com.fitnessuplink.billing.PaymentProvider;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormationRegistrationService {

    private static final List<FormationRegistrationStatus> ACTIVE_STATUSES =
            List.of(FormationRegistrationStatus.PENDING_PAYMENT, FormationRegistrationStatus.CONFIRMED);

    private final FormationRepository formationRepository;
    private final FormationSessionRepository sessionRepository;
    private final FormationRegistrationRepository registrationRepository;
    private final FormationPaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final PaymentProvider paymentProvider;
    private final NotificationService notificationService;
    private final AcademyMailService academyMailService;
    private final PermissionService permissionService;

    @Transactional
    public RegistrationDto register(User member, UUID sessionId) {
        requireMember(member);
        FormationSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        if (session.getStatus() != FormationSessionStatus.SCHEDULED || session.getScheduledAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.CONFLICT, "SESSION_NOT_OPEN");
        }
        Formation formation = formationRepository.findById(session.getFormationId())
                .filter(Formation::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));

        long activeCount = registrationRepository.countBySessionIdAndStatusIn(sessionId, ACTIVE_STATUSES);
        boolean hasSeat = activeCount < session.getCapacity();
        boolean free = formation.getPriceAmount() == null || formation.getPriceAmount().signum() <= 0;

        Instant now = Instant.now();
        FormationRegistration registration = FormationRegistration.builder()
                .id(UUID.randomUUID())
                .sessionId(sessionId)
                .memberId(member.getId())
                .status(hasSeat ? (free ? FormationRegistrationStatus.CONFIRMED : FormationRegistrationStatus.PENDING_PAYMENT)
                        : FormationRegistrationStatus.WAITLISTED)
                .waitlistPosition(hasSeat ? null : nextWaitlistPosition(sessionId))
                .createdAt(now)
                .updatedAt(now)
                .build();
        try {
            registrationRepository.saveAndFlush(registration);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REGISTERED");
        }

        User organizer = userRepository.findById(formation.getOrganizerId()).orElse(null);
        if (registration.getStatus() == FormationRegistrationStatus.WAITLISTED) {
            notificationService.notify(member.getId(), NotifyCategory.CONTACT,
                    "Sur liste d'attente", "La session « " + formation.getTitle() + "» est complète. Vous êtes en liste d'attente.",
                    "Voir", "/app/academy/registrations");
        } else if (organizer != null) {
            notificationService.notify(organizer.getId(), NotifyCategory.CONTACT,
                    "Nouvelle inscription", member.getDisplayName() + " s'est inscrit(e) à « " + formation.getTitle() + "».",
                    "Voir", "/app/academy/formations");
            if (free) {
                academyMailService.enqueueRegistrationConfirmed(member, formation.getTitle(), session.getScheduledAt());
            }
        }
        return toDto(registration, formation, session);
    }

    @Transactional
    public RegistrationDto pay(User member, UUID registrationId, PayRegistrationRequest request) {
        requireMember(member);
        FormationRegistration registration = registrationRepository.findByIdAndMemberId(registrationId, member.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REGISTRATION_NOT_FOUND"));
        if (registration.getStatus() != FormationRegistrationStatus.PENDING_PAYMENT) {
            throw new ApiException(HttpStatus.CONFLICT, "REGISTRATION_NOT_AWAITING_PAYMENT");
        }
        FormationSession session = sessionRepository.findById(registration.getSessionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        Formation formation = formationRepository.findById(session.getFormationId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));

        ChargeResult result = paymentProvider.charge(request.cardNumber(), formation.getPriceAmount(), formation.getPriceCurrency());
        Instant now = Instant.now();
        FormationPayment payment = FormationPayment.builder()
                .id(UUID.randomUUID())
                .memberId(member.getId())
                .registrationId(registration.getId())
                .amount(formation.getPriceAmount())
                .currency(formation.getPriceCurrency())
                .status(result.success() ? FormationPaymentStatus.SUCCEEDED : FormationPaymentStatus.FAILED)
                .provider(result.provider())
                .providerRef(result.reference())
                .invoiceNumber(invoiceNumber())
                .invoiceHtml(escapeHtml("Formation : " + formation.getTitle()))
                .createdAt(now)
                .build();
        paymentRepository.save(payment);
        if (!result.success()) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "PAYMENT_FAILED");
        }
        registration.setPaymentId(payment.getId());
        registration.setStatus(FormationRegistrationStatus.CONFIRMED);
        registration.setUpdatedAt(now);
        registrationRepository.save(registration);

        User organizer = userRepository.findById(formation.getOrganizerId()).orElse(null);
        if (organizer != null) {
            notificationService.notify(organizer.getId(), NotifyCategory.CONTACT,
                    "Paiement reçu", member.getDisplayName() + " a payé son inscription à « " + formation.getTitle() + "».",
                    "Voir", "/app/academy/formations");
        }
        academyMailService.enqueueRegistrationConfirmed(member, formation.getTitle(), session.getScheduledAt());
        return toDto(registration, formation, session);
    }

    @Transactional
    public RegistrationDto cancel(User user, UUID registrationId) {
        FormationRegistration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REGISTRATION_NOT_FOUND"));
        FormationSession session = sessionRepository.findById(registration.getSessionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        Formation formation = formationRepository.findById(session.getFormationId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));
        boolean isMember = registration.getMemberId().equals(user.getId());
        boolean isOrganizer = formation.getOrganizerId().equals(user.getId());
        if (!user.isSuperAdmin() && !isMember && !isOrganizer) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        if (registration.getStatus() == FormationRegistrationStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "REGISTRATION_ALREADY_CANCELLED");
        }
        boolean wasHoldingSeat = registration.getStatus() == FormationRegistrationStatus.CONFIRMED
                || registration.getStatus() == FormationRegistrationStatus.PENDING_PAYMENT;
        registration.setStatus(FormationRegistrationStatus.CANCELLED);
        registration.setWaitlistPosition(null);
        registration.setUpdatedAt(Instant.now());
        registrationRepository.save(registration);

        if (wasHoldingSeat) {
            promoteNextWaitlisted(session, formation);
        }
        renumberWaitlist(session.getId());

        User member = userRepository.findById(registration.getMemberId()).orElse(null);
        User notifyTarget = isMember ? userRepository.findById(formation.getOrganizerId()).orElse(null) : member;
        if (notifyTarget != null) {
            notificationService.notify(notifyTarget.getId(), NotifyCategory.CONTACT,
                    "Inscription annulée", "Une inscription à « " + formation.getTitle() + "» a été annulée.",
                    "Voir", isMember ? "/app/academy/formations" : "/app/academy/registrations");
        }
        return toDto(registration, formation, session);
    }

    @Transactional(readOnly = true)
    public RegistrationDto get(User user, UUID registrationId) {
        FormationRegistration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REGISTRATION_NOT_FOUND"));
        FormationSession session = sessionRepository.findById(registration.getSessionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        Formation formation = formationRepository.findById(session.getFormationId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));
        if (!user.isSuperAdmin() && !registration.getMemberId().equals(user.getId()) && !formation.getOrganizerId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        return toDto(registration, formation, session);
    }

    @Transactional(readOnly = true)
    public List<RegistrationDto> mine(User member) {
        requireMember(member);
        List<FormationRegistration> registrations = registrationRepository.findByMemberIdOrderByCreatedAtDesc(member.getId());
        List<UUID> sessionIds = registrations.stream().map(FormationRegistration::getSessionId).distinct().toList();
        Map<UUID, FormationSession> sessions = sessionRepository.findAllById(sessionIds).stream()
                .collect(Collectors.toMap(FormationSession::getId, s -> s));
        Map<UUID, Formation> formations = formationRepository.findAllById(
                sessions.values().stream().map(FormationSession::getFormationId).distinct().toList()
        ).stream().collect(Collectors.toMap(Formation::getId, f -> f));
        return registrations.stream()
                .map(r -> {
                    FormationSession session = sessions.get(r.getSessionId());
                    Formation formation = session == null ? null : formations.get(session.getFormationId());
                    return toDto(r, formation, session);
                })
                .toList();
    }

    void promoteNextWaitlisted(FormationSession session, Formation formation) {
        List<FormationRegistration> waitlisted = registrationRepository
                .findBySessionIdAndStatusOrderByCreatedAtAsc(session.getId(), FormationRegistrationStatus.WAITLISTED);
        if (waitlisted.isEmpty()) {
            return;
        }
        FormationRegistration promoted = waitlisted.get(0);
        boolean free = formation.getPriceAmount() == null || formation.getPriceAmount().signum() <= 0;
        promoted.setStatus(free ? FormationRegistrationStatus.CONFIRMED : FormationRegistrationStatus.PENDING_PAYMENT);
        promoted.setWaitlistPosition(null);
        promoted.setUpdatedAt(Instant.now());
        registrationRepository.save(promoted);
        User member = userRepository.findById(promoted.getMemberId()).orElse(null);
        if (member != null) {
            notificationService.notify(member.getId(), NotifyCategory.CONTACT,
                    "Une place s'est libérée !",
                    free
                            ? "Votre place pour « " + formation.getTitle() + "» est confirmée."
                            : "Une place s'est libérée pour « " + formation.getTitle() + "». Payez pour la confirmer.",
                    "Voir", "/app/academy/registrations");
            academyMailService.enqueueWaitlistPromoted(member, formation.getTitle(), session.getScheduledAt());
        }
    }

    private void renumberWaitlist(UUID sessionId) {
        List<FormationRegistration> waitlisted = registrationRepository
                .findBySessionIdAndStatusOrderByCreatedAtAsc(sessionId, FormationRegistrationStatus.WAITLISTED);
        for (int i = 0; i < waitlisted.size(); i++) {
            FormationRegistration reg = waitlisted.get(i);
            int position = i + 1;
            if (!Integer.valueOf(position).equals(reg.getWaitlistPosition())) {
                reg.setWaitlistPosition(position);
                registrationRepository.save(reg);
            }
        }
    }

    private Integer nextWaitlistPosition(UUID sessionId) {
        return (int) registrationRepository
                .findBySessionIdAndStatusOrderByCreatedAtAsc(sessionId, FormationRegistrationStatus.WAITLISTED)
                .size() + 1;
    }

    private void requireMember(User user) {
        permissionService.require(user, Permissions.ACADEMY_BROWSE);
    }

    private String invoiceNumber() {
        return "AC-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private RegistrationDto toDto(FormationRegistration registration, Formation formation, FormationSession session) {
        return new RegistrationDto(
                registration.getId(),
                registration.getSessionId(),
                formation == null ? null : formation.getId(),
                formation == null ? "Formation" : formation.getTitle(),
                session == null ? null : session.getScheduledAt(),
                registration.getStatus().name(),
                registration.getWaitlistPosition(),
                formation == null ? BigDecimal.ZERO : formation.getPriceAmount(),
                formation == null ? "TND" : formation.getPriceCurrency(),
                registration.getCreatedAt()
        );
    }
}
