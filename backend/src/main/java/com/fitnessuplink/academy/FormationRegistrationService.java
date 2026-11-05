package com.fitnessuplink.academy;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.academy.dto.AcademyDtos.CheckinDto;
import com.fitnessuplink.academy.dto.AcademyDtos.PayRegistrationRequest;
import com.fitnessuplink.academy.dto.AcademyDtos.ReceiptDto;
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
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormationRegistrationService {

    /** An online payment keeps its seat for this long; afterwards the seat goes back to the public. */
    static final Duration HOLD = Duration.ofMinutes(5);
    /** A member may cancel a paid / reserved seat until this long before the session starts. */
    static final Duration CANCEL_NOTICE = Duration.ofHours(48);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final FormationRepository formationRepository;
    private final FormationSessionRepository sessionRepository;
    private final FormationRegistrationRepository registrationRepository;
    private final FormationPaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final PaymentProvider paymentProvider;
    private final NotificationService notificationService;
    private final AcademyMailService academyMailService;
    private final PermissionService permissionService;

    // ------------------------------------------------------------------ register / pay

    @Transactional
    public RegistrationDto register(User member, UUID sessionId, PaymentMethod requestedMethod) {
        requireMember(member);
        requireNoDebt(member.getId());
        // The row lock on the session serialises every seat decision for this session: two people can never
        // both take the last seat.
        FormationSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        requireOpen(session);
        Formation formation = formationRepository.findById(session.getFormationId())
                .filter(Formation::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));

        Instant now = Instant.now();
        boolean hasSeat = seatsTaken(sessionId) < session.getCapacity();
        boolean free = isFree(formation);
        PaymentMethod method = free || requestedMethod == null ? PaymentMethod.ONLINE : requestedMethod;
        if (!free) {
            boolean accepted = method == PaymentMethod.ON_SITE ? formation.isAcceptsOnSite() : formation.isAcceptsOnline();
            if (!accepted) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "PAYMENT_METHOD_NOT_ACCEPTED");
            }
        }

        FormationRegistrationStatus status;
        Instant holdUntil = null;
        if (!hasSeat) {
            status = FormationRegistrationStatus.WAITLISTED;
        } else if (free) {
            status = FormationRegistrationStatus.CONFIRMED;
        } else if (method == PaymentMethod.ON_SITE) {
            status = FormationRegistrationStatus.PENDING_ON_SITE;
        } else {
            status = FormationRegistrationStatus.PENDING_PAYMENT;
            holdUntil = now.plus(HOLD);
        }
        FormationRegistration registration = FormationRegistration.builder()
                .id(UUID.randomUUID())
                .sessionId(sessionId)
                .memberId(member.getId())
                .status(status)
                .waitlistPosition(hasSeat ? null : nextWaitlistPosition(sessionId))
                .paymentMethod(method)
                .holdExpiresAt(holdUntil)
                .ticketToken(newTicketToken())
                .createdAt(now)
                .updatedAt(now)
                .build();
        try {
            registrationRepository.saveAndFlush(registration);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REGISTERED");
        }

        User organizer = userRepository.findById(formation.getOrganizerId()).orElse(null);
        if (status == FormationRegistrationStatus.WAITLISTED) {
            notificationService.notify(member.getId(), NotifyCategory.CONTACT,
                    "Sur liste d'attente", "La session « " + formation.getTitle() + "» est complète. Vous êtes en liste d'attente.",
                    "Voir", "/app/academy/registrations");
        } else if (organizer != null) {
            notificationService.notify(organizer.getId(), NotifyCategory.CONTACT,
                    "Nouvelle inscription", member.getDisplayName() + " s'est inscrit(e) à « " + formation.getTitle() + "»"
                            + (status == FormationRegistrationStatus.PENDING_ON_SITE ? " (paiement sur place)." : "."),
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
        FormationSession session = sessionRepository.findByIdForUpdate(registration.getSessionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        Formation formation = formationRepository.findById(session.getFormationId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));
        Instant now = Instant.now();
        FormationRegistrationStatus current = registration.getStatus();
        boolean debt = current == FormationRegistrationStatus.NO_SHOW && registration.getPaymentId() == null;
        if (current == FormationRegistrationStatus.PENDING_PAYMENT) {
            if (registration.getHoldExpiresAt() == null || !registration.getHoldExpiresAt().isAfter(now)) {
                releaseHold(registration, now);
                throw new ApiException(HttpStatus.CONFLICT, "HOLD_EXPIRED");
            }
            requireOpen(session);
        } else if (current == FormationRegistrationStatus.PENDING_ON_SITE) {
            requireOpen(session);
        } else if (!debt) {
            throw new ApiException(HttpStatus.CONFLICT, "REGISTRATION_NOT_AWAITING_PAYMENT");
        }
        // The seat is already held (hold / on-site promise), so there is no seat re-check before charging.

        ChargeResult result = paymentProvider.charge(request.cardNumber(), formation.getPriceAmount(), formation.getPriceCurrency());
        FormationPayment payment = paymentRepository.save(FormationPayment.builder()
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
                .build());
        if (!result.success()) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "PAYMENT_FAILED");
        }
        registration.setPaymentId(payment.getId());
        registration.setHoldExpiresAt(null);
        if (!debt) {
            registration.setPaymentMethod(PaymentMethod.ONLINE);
            registration.setStatus(FormationRegistrationStatus.CONFIRMED);
        }
        registration.setUpdatedAt(now);
        registrationRepository.save(registration);

        User organizer = userRepository.findById(formation.getOrganizerId()).orElse(null);
        if (organizer != null) {
            notificationService.notify(organizer.getId(), NotifyCategory.CONTACT,
                    "Paiement reçu", member.getDisplayName() + " a payé son inscription à « " + formation.getTitle() + "».",
                    "Voir", "/app/academy/formations");
        }
        if (!debt) {
            academyMailService.enqueueRegistrationConfirmed(member, formation.getTitle(), session.getScheduledAt());
        }
        return toDto(registration, formation, session);
    }

    // ------------------------------------------------------------------ cancel

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
        if (registration.getStatus() == FormationRegistrationStatus.NO_SHOW) {
            throw new ApiException(HttpStatus.CONFLICT, "REGISTRATION_NO_SHOW");
        }
        if (isMember && !isOrganizer && !user.isSuperAdmin() && !canMemberCancel(registration, session)) {
            throw new ApiException(HttpStatus.CONFLICT, "CANCEL_TOO_LATE");
        }
        boolean wasHoldingSeat = registration.getStatus() == FormationRegistrationStatus.CONFIRMED
                || registration.getStatus() == FormationRegistrationStatus.PENDING_ON_SITE;
        boolean wasPaid = registration.getPaymentId() != null;
        registration.setStatus(FormationRegistrationStatus.CANCELLED);
        registration.setWaitlistPosition(null);
        registration.setHoldExpiresAt(null);
        registration.setUpdatedAt(Instant.now());
        registrationRepository.save(registration);

        if (wasHoldingSeat) {
            promoteNextWaitlisted(session, formation);
        }
        renumberWaitlist(session.getId());

        User member = userRepository.findById(registration.getMemberId()).orElse(null);
        User notifyTarget = isMember ? userRepository.findById(formation.getOrganizerId()).orElse(null) : member;
        if (notifyTarget != null) {
            String refund = isMember && wasPaid ? " Un remboursement est à traiter manuellement." : "";
            notificationService.notify(notifyTarget.getId(), NotifyCategory.CONTACT,
                    "Inscription annulée", "Une inscription à « " + formation.getTitle() + "» a été annulée." + refund,
                    "Voir", isMember ? "/app/academy/formations" : "/app/academy/registrations");
        }
        return toDto(registration, formation, session);
    }

    // ------------------------------------------------------------------ reads

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

    /** Registrations the member still has to pay after not showing up. Non-empty = account blocked. */
    @Transactional(readOnly = true)
    public List<RegistrationDto> debts(User member) {
        return mine(member).stream()
                .filter(r -> "NO_SHOW".equals(r.status()) && !r.paid())
                .toList();
    }

    @Transactional(readOnly = true)
    public ReceiptDto receipt(User user, UUID registrationId) {
        FormationRegistration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REGISTRATION_NOT_FOUND"));
        FormationSession session = sessionRepository.findById(registration.getSessionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        Formation formation = formationRepository.findById(session.getFormationId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));
        if (!user.isSuperAdmin() && !registration.getMemberId().equals(user.getId()) && !formation.getOrganizerId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        FormationPayment payment = registration.getPaymentId() == null ? null
                : paymentRepository.findById(registration.getPaymentId()).orElse(null);
        if (payment == null || payment.getStatus() != FormationPaymentStatus.SUCCEEDED) {
            throw new ApiException(HttpStatus.NOT_FOUND, "RECEIPT_NOT_AVAILABLE");
        }
        User member = userRepository.findById(registration.getMemberId()).orElse(null);
        return new ReceiptDto(
                payment.getInvoiceNumber(),
                formation.getTitle(),
                session.getScheduledAt(),
                member == null ? "Membre" : member.getDisplayName(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getProvider(),
                payment.getCreatedAt()
        );
    }

    // ------------------------------------------------------------------ door check-in (QR)

    @Transactional(readOnly = true)
    public CheckinDto lookupTicket(User organizer, String token) {
        FormationRegistration registration = requireTicket(token);
        FormationSession session = sessionRepository.findById(registration.getSessionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        Formation formation = formationRepository.findById(session.getFormationId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));
        requireScanner(organizer, formation);
        return toCheckin(registration, formation, session);
    }

    @Transactional
    public CheckinDto confirmTicket(User organizer, String token) {
        FormationRegistration registration = requireTicket(token);
        FormationSession session = sessionRepository.findByIdForUpdate(registration.getSessionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SESSION_NOT_FOUND"));
        Formation formation = formationRepository.findById(session.getFormationId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FORMATION_NOT_FOUND"));
        requireScanner(organizer, formation);
        // re-read under the lock so two scanners cannot both validate the same ticket
        registration = registrationRepository.findById(registration.getId()).orElseThrow();
        String block = blockReason(registration, session);
        if (block != null) {
            throw new ApiException(HttpStatus.CONFLICT, block);
        }
        Instant now = Instant.now();
        if (registration.getStatus() == FormationRegistrationStatus.PENDING_ON_SITE) {
            FormationPayment payment = paymentRepository.save(FormationPayment.builder()
                    .id(UUID.randomUUID())
                    .memberId(registration.getMemberId())
                    .registrationId(registration.getId())
                    .amount(formation.getPriceAmount())
                    .currency(formation.getPriceCurrency())
                    .status(FormationPaymentStatus.SUCCEEDED)
                    .provider("ON_SITE")
                    .providerRef(null)
                    .invoiceNumber(invoiceNumber())
                    .invoiceHtml(escapeHtml("Formation : " + formation.getTitle()))
                    .collectedBy(organizer.getId())
                    .createdAt(now)
                    .build());
            registration.setPaymentId(payment.getId());
            registration.setStatus(FormationRegistrationStatus.CONFIRMED);
        }
        registration.setCheckedInAt(now);
        registration.setCheckedInBy(organizer.getId());
        registration.setUpdatedAt(now);
        registrationRepository.save(registration);
        return toCheckin(registration, formation, session);
    }

    // ------------------------------------------------------------------ jobs

    /** Seats whose online payment window (5 min) ran out go back to the public. */
    @Transactional
    public void expireHolds() {
        Instant now = Instant.now();
        registrationRepository.findByStatusAndHoldExpiresAtBefore(FormationRegistrationStatus.PENDING_PAYMENT, now)
                .forEach(registration -> releaseHold(registration, now));
    }

    /** After a session ends, "pay on site" members who were never scanned owe the amount and are blocked. */
    @Transactional
    public void markNoShows(FormationSession session) {
        Formation formation = formationRepository.findById(session.getFormationId()).orElse(null);
        Instant now = Instant.now();
        for (FormationRegistration registration : registrationRepository
                .findBySessionIdAndStatus(session.getId(), FormationRegistrationStatus.PENDING_ON_SITE)) {
            registration.setStatus(FormationRegistrationStatus.NO_SHOW);
            registration.setUpdatedAt(now);
            registrationRepository.save(registration);
            if (formation != null) {
                notificationService.notify(registration.getMemberId(), NotifyCategory.CONTACT,
                        "Paiement en attente",
                        "Vous ne vous êtes pas présenté(e) à « " + formation.getTitle() + "» : réglez "
                                + formation.getPriceAmount().stripTrailingZeros().toPlainString() + " " + formation.getPriceCurrency()
                                + " dans l'application pour réserver à nouveau.",
                        "Payer", "/app/academy/debt");
            }
        }
    }

    void promoteNextWaitlisted(FormationSession session, Formation formation) {
        List<FormationRegistration> waitlisted = registrationRepository
                .findBySessionIdAndStatusOrderByCreatedAtAsc(session.getId(), FormationRegistrationStatus.WAITLISTED);
        if (waitlisted.isEmpty()) {
            return;
        }
        FormationRegistration promoted = waitlisted.get(0);
        boolean free = isFree(formation);
        Instant now = Instant.now();
        promoted.setStatus(free ? FormationRegistrationStatus.CONFIRMED : FormationRegistrationStatus.PENDING_PAYMENT);
        promoted.setHoldExpiresAt(free ? null : now.plus(HOLD));
        promoted.setWaitlistPosition(null);
        promoted.setUpdatedAt(now);
        registrationRepository.save(promoted);
        User member = userRepository.findById(promoted.getMemberId()).orElse(null);
        if (member != null) {
            notificationService.notify(member.getId(), NotifyCategory.CONTACT,
                    "Une place s'est libérée !",
                    free
                            ? "Votre place pour « " + formation.getTitle() + "» est confirmée."
                            : "Une place s'est libérée pour « " + formation.getTitle() + "». Payez dans les 5 minutes pour la confirmer.",
                    "Voir", "/app/academy/registrations");
            academyMailService.enqueueWaitlistPromoted(member, formation.getTitle(), session.getScheduledAt());
        }
    }

    // ------------------------------------------------------------------ helpers

    private void releaseHold(FormationRegistration registration, Instant now) {
        registration.setStatus(FormationRegistrationStatus.CANCELLED);
        registration.setHoldExpiresAt(null);
        registration.setUpdatedAt(now);
        registrationRepository.save(registration);
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

    private void requireOpen(FormationSession session) {
        if (session.getStatus() != FormationSessionStatus.SCHEDULED || session.getScheduledAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.CONFLICT, "SESSION_NOT_OPEN");
        }
    }

    private long seatsTaken(UUID sessionId) {
        return registrationRepository.countSeatsTaken(sessionId, Instant.now());
    }

    private void requireMember(User user) {
        permissionService.require(user, Permissions.ACADEMY_BROWSE);
    }

    private void requireNoDebt(UUID memberId) {
        if (registrationRepository.existsByMemberIdAndStatusAndPaymentIdIsNull(memberId, FormationRegistrationStatus.NO_SHOW)) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCOUNT_BLOCKED_UNPAID");
        }
    }

    private void requireScanner(User user, Formation formation) {
        if (!user.isSuperAdmin() && !formation.getOrganizerId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
    }

    private FormationRegistration requireTicket(String token) {
        if (token == null || token.isBlank() || token.length() > 64) {
            throw new ApiException(HttpStatus.NOT_FOUND, "TICKET_NOT_FOUND");
        }
        return registrationRepository.findByTicketToken(token.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TICKET_NOT_FOUND"));
    }

    private static boolean isFree(Formation formation) {
        return formation.getPriceAmount() == null || formation.getPriceAmount().signum() <= 0;
    }

    private static String newTicketToken() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
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

    /** A member can cancel a seat they hold only up to 48 h before the session; holds and waitlist spots are free to leave. */
    private boolean canMemberCancel(FormationRegistration registration, FormationSession session) {
        switch (registration.getStatus()) {
            case PENDING_PAYMENT, WAITLISTED:
                return true;
            case CONFIRMED, PENDING_ON_SITE:
                return registration.getCheckedInAt() == null
                        && Instant.now().isBefore(session.getScheduledAt().minus(CANCEL_NOTICE));
            default:
                return false;
        }
    }

    private String blockReason(FormationRegistration registration, FormationSession session) {
        if (registration.getCheckedInAt() != null) {
            return "ALREADY_CHECKED_IN";
        }
        if (session.getStatus() == FormationSessionStatus.CANCELLED) {
            return "SESSION_CANCELLED";
        }
        return switch (registration.getStatus()) {
            case CONFIRMED, PENDING_ON_SITE -> null;
            case PENDING_PAYMENT -> "PAYMENT_NOT_DONE";
            case WAITLISTED -> "ON_WAITLIST";
            case CANCELLED -> "REGISTRATION_CANCELLED";
            case NO_SHOW -> "REGISTRATION_NO_SHOW";
        };
    }

    private CheckinDto toCheckin(FormationRegistration registration, Formation formation, FormationSession session) {
        User member = userRepository.findById(registration.getMemberId()).orElse(null);
        boolean paid = registration.getPaymentId() != null || isFree(formation);
        boolean owes = !paid && registration.getStatus() == FormationRegistrationStatus.PENDING_ON_SITE;
        String block = blockReason(registration, session);
        return new CheckinDto(
                registration.getId(),
                member == null ? "Membre" : member.getDisplayName(),
                formation.getTitle(),
                session.getScheduledAt(),
                registration.getStatus().name(),
                registration.getPaymentMethod() == null ? null : registration.getPaymentMethod().name(),
                paid,
                owes ? formation.getPriceAmount() : BigDecimal.ZERO,
                formation.getPriceCurrency(),
                registration.getCheckedInAt(),
                block == null,
                block
        );
    }

    private RegistrationDto toDto(FormationRegistration registration, Formation formation, FormationSession session) {
        boolean paid = registration.getPaymentId() != null
                || (formation != null && isFree(formation) && registration.getStatus() == FormationRegistrationStatus.CONFIRMED);
        FormationPayment payment = registration.getPaymentId() == null ? null
                : paymentRepository.findById(registration.getPaymentId()).orElse(null);
        Instant deadline = session == null ? null : session.getScheduledAt().minus(CANCEL_NOTICE);
        boolean canCancel = session != null && canMemberCancel(registration, session);
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
                registration.getCreatedAt(),
                registration.getPaymentMethod() == null ? null : registration.getPaymentMethod().name(),
                paid,
                registration.getStatus() == FormationRegistrationStatus.CONFIRMED
                        || registration.getStatus() == FormationRegistrationStatus.PENDING_ON_SITE
                        ? registration.getTicketToken() : null,
                registration.getStatus() == FormationRegistrationStatus.PENDING_PAYMENT ? registration.getHoldExpiresAt() : null,
                registration.getCheckedInAt(),
                canCancel,
                deadline,
                payment == null ? null : payment.getInvoiceNumber()
        );
    }
}
