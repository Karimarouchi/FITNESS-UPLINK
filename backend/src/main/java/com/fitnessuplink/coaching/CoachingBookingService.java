package com.fitnessuplink.coaching;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.billing.ChargeResult;
import com.fitnessuplink.billing.PaymentProvider;
import com.fitnessuplink.coaching.dto.CoachingDtos.BookingDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CancelBookingRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachAgendaSummaryDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CreateBookingRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.DeclineBookingRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.PayBookingRequest;
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

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CoachingBookingService {

    private final CoachingBookingRepository bookingRepository;
    private final CoachServiceRepository coachServiceRepository;
    private final CoachingPaymentRepository paymentRepository;
    private final CoachingReviewRepository reviewRepository;
    private final CoachSearchService coachSearchService;
    private final CoachingPackService coachingPackService;
    private final CoachSettingsService coachSettingsService;
    private final CoachingCommissionService coachingCommissionService;
    private final CoachAvailabilityService coachAvailabilityService;
    private final UserRepository userRepository;
    private final PaymentProvider paymentProvider;
    private final NotificationService notificationService;
    private final PermissionService permissionService;
    private final ObjectMapper objectMapper;

    /** A client may book up to this many consecutive service blocks in one booking. */
    private static final int MAX_BLOCKS = 4;

    @Transactional
    public BookingDto book(User client, CreateBookingRequest request) {
        requireClient(client);
        CoachService service = coachServiceRepository.findById(request.coachServiceId())
                .filter(CoachService::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COACH_SERVICE_NOT_FOUND"));
        User coach = coachSearchService.requireCoach(service.getCoachId());
        if (request.scheduledAt() == null || request.scheduledAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SLOT_INVALID");
        }
        Instant start = request.scheduledAt();
        int unit = service.getDurationMinutes();
        int blocks = 1;
        if (request.durationMinutes() != null) {
            if (request.durationMinutes() < unit || request.durationMinutes() % unit != 0 || request.durationMinutes() / unit > MAX_BLOCKS) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "DURATION_INVALID");
            }
            blocks = request.durationMinutes() / unit;
        }
        int totalMinutes = unit * blocks;
        Instant end = start.plusSeconds(totalMinutes * 60L);
        LocalDate slotDate = LocalDate.ofInstant(start, ZoneOffset.UTC);
        // Every consecutive block must be a free slot of the coach's availability (same day, no gap, no booking).
        java.util.Set<Instant> freeStarts = coachAvailabilityService.slotsFor(coach.getId(), service.getId(), slotDate).stream()
                .filter(slot -> slot.available())
                .map(slot -> slot.start())
                .collect(java.util.stream.Collectors.toSet());
        for (int i = 0; i < blocks; i++) {
            if (!freeStarts.contains(start.plusSeconds((long) unit * 60L * i))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, blocks > 1 ? "RANGE_UNAVAILABLE" : "SLOT_INVALID");
            }
        }
        boolean overlap = bookingRepository.findByCoachIdAndScheduledAtBetween(coach.getId(), start.minusSeconds(1), end).stream()
                .filter(CoachAvailabilityService::holdsSlot)
                .anyMatch(b -> start.isBefore(b.endsAt()) && end.isAfter(b.getScheduledAt()));
        if (overlap) {
            throw new ApiException(HttpStatus.CONFLICT, "SLOT_TAKEN");
        }

        Instant now = Instant.now();
        CoachingBooking booking = CoachingBooking.builder()
                .id(UUID.randomUUID())
                .coachId(coach.getId())
                .clientId(client.getId())
                .coachServiceId(service.getId())
                .packId(null)
                .scheduledAt(start)
                .durationMinutes(totalMinutes)
                .status(CoachingBookingStatus.PENDING)
                .priceAmount(service.getPriceAmount() == null ? null
                        : service.getPriceAmount().multiply(java.math.BigDecimal.valueOf(blocks)))
                .priceCurrency(service.getPriceCurrency())
                .paymentId(null)
                .createdAt(now)
                .updatedAt(now)
                .build();
        try {
            bookingRepository.saveAndFlush(booking);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "SLOT_TAKEN");
        }
        notificationService.notify(coach.getId(), NotifyCategory.CONTACT,
                "Nouvelle demande", client.getDisplayName() + " demande une séance le " + start + ".",
                "Voir l'agenda", "/app/coaching/agenda");
        notificationService.notify(client.getId(), NotifyCategory.CONTACT,
                "Demande envoyée", "Votre demande de séance avec " + coach.getDisplayName() + " est en attente de confirmation.",
                "Voir", "/app/coaching/bookings");

        return toDto(booking, coach, client, service.getName());
    }

    @Transactional
    public BookingDto cancel(User user, UUID bookingId, CancelBookingRequest request) {
        CoachingBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND"));
        boolean isCoach = booking.getCoachId().equals(user.getId());
        boolean isClient = booking.getClientId().equals(user.getId());
        if (!user.isSuperAdmin() && !isCoach && !isClient) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        if (booking.getStatus() != CoachingBookingStatus.CONFIRMED
                && booking.getStatus() != CoachingBookingStatus.PENDING
                && booking.getStatus() != CoachingBookingStatus.AWAITING_PAYMENT) {
            throw new ApiException(HttpStatus.CONFLICT, "BOOKING_NOT_CANCELLABLE");
        }
        if (isClient && !user.isSuperAdmin() && booking.getStatus() == CoachingBookingStatus.CONFIRMED) {
            int deadlineHours = coachSettingsService.deadlineHoursFor(booking.getCoachId());
            if (deadlineHours > 0 && Instant.now().isAfter(booking.getScheduledAt().minusSeconds(deadlineHours * 3600L))) {
                throw new ApiException(HttpStatus.CONFLICT, "CANCELLATION_DEADLINE_PASSED");
            }
        }
        booking.setStatus(CoachingBookingStatus.CANCELLED);
        booking.setCancelledReason(request == null ? null : request.reason());
        booking.setUpdatedAt(Instant.now());
        bookingRepository.save(booking);
        if (booking.getPackId() != null) {
            coachingPackService.releaseSessionById(booking.getPackId());
        }
        UUID notifyTarget = isClient ? booking.getCoachId() : booking.getClientId();
        notificationService.notify(notifyTarget, NotifyCategory.CONTACT,
                "Séance annulée", "Une séance prévue le " + booking.getScheduledAt() + " a été annulée.",
                "Voir", "/app/coaching/bookings");
        User coach = userRepository.findById(booking.getCoachId()).orElse(null);
        User client = userRepository.findById(booking.getClientId()).orElse(null);
        String serviceName = coachServiceRepository.findById(booking.getCoachServiceId()).map(CoachService::getName).orElse("Séance");
        return toDto(booking, coach, client, serviceName);
    }

    @Transactional
    public BookingDto confirmBooking(User coach, UUID bookingId) {
        requireCoach(coach);
        CoachingBooking booking = bookingRepository.findByIdAndCoachId(bookingId, coach.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND"));
        if (booking.getStatus() != CoachingBookingStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "BOOKING_NOT_PENDING");
        }
        User client = userRepository.findById(booking.getClientId()).orElse(null);
        String serviceName = coachServiceRepository.findById(booking.getCoachServiceId()).map(CoachService::getName).orElse("Séance");
        var pack = coachingPackService.findUsablePack(booking.getClientId(), booking.getCoachId());
        if (pack.isPresent()) {
            coachingPackService.consumeSession(pack.get());
            booking.setPackId(pack.get().getId());
            booking.setStatus(CoachingBookingStatus.CONFIRMED);
            booking.setUpdatedAt(Instant.now());
            bookingRepository.save(booking);
            notificationService.notify(booking.getClientId(), NotifyCategory.CONTACT,
                    "Séance confirmée", coach.getDisplayName() + " a accepté. La séance est débitée sur votre pack.",
                    "Voir", "/app/coaching/bookings");
        } else {
            booking.setStatus(CoachingBookingStatus.AWAITING_PAYMENT);
            booking.setUpdatedAt(Instant.now());
            bookingRepository.save(booking);
            notificationService.notify(booking.getClientId(), NotifyCategory.CONTACT,
                    "À payer", coach.getDisplayName() + " a accepté votre créneau. Réglez pour confirmer la séance.",
                    "Payer", "/app/coaching/bookings/" + booking.getId() + "/pay");
        }
        return toDto(booking, coach, client, serviceName);
    }

    @Transactional
    public BookingDto pay(User client, UUID bookingId, PayBookingRequest request) {
        requireClient(client);
        CoachingBooking booking = bookingRepository.findByIdAndClientId(bookingId, client.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND"));
        if (booking.getStatus() != CoachingBookingStatus.AWAITING_PAYMENT) {
            throw new ApiException(HttpStatus.CONFLICT, "BOOKING_NOT_AWAITING_PAYMENT");
        }
        ChargeResult result = paymentProvider.charge(request.cardNumber(), booking.getPriceAmount(), booking.getPriceCurrency());
        var commissionRate = coachingCommissionService.currentRate();
        Instant now = Instant.now();
        CoachingPayment payment = CoachingPayment.builder()
                .id(UUID.randomUUID())
                .clientId(client.getId())
                .coachId(booking.getCoachId())
                .bookingId(booking.getId())
                .amount(booking.getPriceAmount())
                .currency(booking.getPriceCurrency())
                .status(result.success() ? CoachingPaymentStatus.SUCCEEDED : CoachingPaymentStatus.FAILED)
                .provider(result.provider())
                .providerRef(result.reference())
                .invoiceNumber(invoiceNumber())
                .invoiceHtml(CoachingPackService.escapeHtml("Séance"))
                .commissionRate(commissionRate)
                .commissionAmount(coachingCommissionService.amountFor(booking.getPriceAmount(), commissionRate))
                .createdAt(now)
                .build();
        paymentRepository.save(payment);
        if (!result.success()) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "PAYMENT_FAILED");
        }
        booking.setPaymentId(payment.getId());
        booking.setStatus(CoachingBookingStatus.CONFIRMED);
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);
        User coach = userRepository.findById(booking.getCoachId()).orElse(null);
        String serviceName = coachServiceRepository.findById(booking.getCoachServiceId()).map(CoachService::getName).orElse("Séance");
        notificationService.notify(booking.getCoachId(), NotifyCategory.CONTACT,
                "Paiement reçu", client.getDisplayName() + " a payé la séance du " + booking.getScheduledAt() + ".",
                "Voir l'agenda", "/app/coaching/agenda");
        return toDto(booking, coach, client, serviceName);
    }

    @Transactional(readOnly = true)
    public BookingDto get(User user, UUID bookingId) {
        CoachingBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND"));
        if (!user.isSuperAdmin() && !booking.getClientId().equals(user.getId()) && !booking.getCoachId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        User coach = userRepository.findById(booking.getCoachId()).orElse(null);
        User client = userRepository.findById(booking.getClientId()).orElse(null);
        String serviceName = coachServiceRepository.findById(booking.getCoachServiceId()).map(CoachService::getName).orElse("Séance");
        return toDto(booking, coach, client, serviceName);
    }

    @Transactional
    public BookingDto declineBooking(User coach, UUID bookingId, DeclineBookingRequest request) {
        requireCoach(coach);
        CoachingBooking booking = bookingRepository.findByIdAndCoachId(bookingId, coach.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND"));
        if (booking.getStatus() != CoachingBookingStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "BOOKING_NOT_PENDING");
        }
        List<Instant> suggestions = validateSuggestedSlots(coach.getId(), booking, request);
        booking.setStatus(CoachingBookingStatus.DECLINED);
        booking.setSuggestedSlotsJson(writeSlots(suggestions));
        booking.setUpdatedAt(Instant.now());
        bookingRepository.save(booking);
        if (booking.getPackId() != null) {
            coachingPackService.releaseSessionById(booking.getPackId());
        }
        User client = userRepository.findById(booking.getClientId()).orElse(null);
        String serviceName = coachServiceRepository.findById(booking.getCoachServiceId()).map(CoachService::getName).orElse("Séance");
        String message = suggestions.isEmpty()
                ? coach.getDisplayName() + " n'est pas disponible pour ce créneau. Vous pouvez choisir une autre date."
                : coach.getDisplayName() + " n'est pas disponible pour ce créneau mais propose " + suggestions.size()
                        + " autre(s) horaire(s). Choisissez-en un dans vos réservations.";
        notificationService.notify(booking.getClientId(), NotifyCategory.CONTACT,
                "Séance refusée", message,
                "Voir", "/app/coaching/bookings");
        return toDto(booking, coach, client, serviceName);
    }

    private List<Instant> validateSuggestedSlots(UUID coachId, CoachingBooking declined, DeclineBookingRequest request) {
        if (request == null || request.suggestedSlots() == null || request.suggestedSlots().isEmpty()) {
            return List.of();
        }
        Instant now = Instant.now();
        int duration = declined.getDurationMinutes();
        List<Instant> valid = new ArrayList<>();
        for (Instant slot : request.suggestedSlots().stream().distinct().limit(3).toList()) {
            if (slot == null || slot.isBefore(now)) {
                continue;
            }
            Instant end = slot.plusSeconds(duration * 60L);
            boolean overlap = bookingRepository.findByCoachIdAndScheduledAtBetween(coachId, slot.minusSeconds(1), end).stream()
                    .filter(b -> !b.getId().equals(declined.getId()))
                    .filter(CoachAvailabilityService::holdsSlot)
                    .anyMatch(b -> slot.isBefore(b.endsAt()) && end.isAfter(b.getScheduledAt()));
            if (!overlap) {
                valid.add(slot);
            }
        }
        return valid;
    }

    private String writeSlots(List<Instant> slots) {
        if (slots == null || slots.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(slots);
        } catch (Exception ex) {
            return null;
        }
    }

    private List<Instant> readSlots(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Instant>>() {});
        } catch (Exception ex) {
            return List.of();
        }
    }

    @Transactional(readOnly = true)
    public List<BookingDto> myBookings(User client) {
        requireClient(client);
        List<CoachingBooking> bookings = bookingRepository.findByClientIdOrderByScheduledAtDesc(client.getId());
        return enrich(bookings, client, true);
    }

    @Transactional(readOnly = true)
    public List<BookingDto> coachBookings(User coach) {
        requireCoach(coach);
        List<CoachingBooking> bookings = bookingRepository.findByCoachIdOrderByScheduledAtDesc(coach.getId());
        return enrich(bookings, coach, false);
    }

    @Transactional(readOnly = true)
    public CoachAgendaSummaryDto agendaSummary(User coach) {
        requireCoach(coach);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        Instant weekStart = monday.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant weekEnd = monday.plusDays(7).atStartOfDay(ZoneOffset.UTC).toInstant();
        long sessionsThisWeek = bookingRepository.countByCoachIdAndStatusAndScheduledAtBetween(
                coach.getId(), CoachingBookingStatus.CONFIRMED, weekStart, weekEnd);
        long pendingCount = bookingRepository.findByCoachIdOrderByScheduledAtDesc(coach.getId()).stream()
                .filter(b -> b.getStatus() == CoachingBookingStatus.PENDING).count();
        long activeClients = bookingRepository.findByCoachIdOrderByScheduledAtDesc(coach.getId()).stream()
                .filter(b -> b.getStatus() == CoachingBookingStatus.CONFIRMED || b.getStatus() == CoachingBookingStatus.COMPLETED
                        || b.getStatus() == CoachingBookingStatus.PENDING)
                .map(CoachingBooking::getClientId)
                .distinct()
                .count();
        long activePacks = coachingPackService.soldPacks(coach).stream()
                .filter(p -> "ACTIVE".equals(p.status()))
                .count();
        List<CoachingReview> reviews = reviewRepository.findByCoachIdOrderByCreatedAtDesc(coach.getId());
        double avgRating = reviews.isEmpty() ? 0.0 : reviews.stream().mapToInt(CoachingReview::getRating).average().orElse(0.0);
        return new CoachAgendaSummaryDto(sessionsThisWeek, activeClients, activePacks, avgRating, pendingCount);
    }

    private List<BookingDto> enrich(List<CoachingBooking> bookings, User viewer, boolean viewerIsClient) {
        List<UUID> otherIds = bookings.stream()
                .map(b -> viewerIsClient ? b.getCoachId() : b.getClientId())
                .distinct()
                .toList();
        Map<UUID, User> others = userRepository.findByIdIn(otherIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<UUID, String> serviceNames = coachServiceRepository.findAllById(bookings.stream().map(CoachingBooking::getCoachServiceId).distinct().toList())
                .stream().collect(Collectors.toMap(CoachService::getId, CoachService::getName));
        return bookings.stream()
                .map(b -> {
                    User coach = viewerIsClient ? others.get(b.getCoachId()) : viewer;
                    User client = viewerIsClient ? viewer : others.get(b.getClientId());
                    return toDto(b, coach, client, serviceNames.getOrDefault(b.getCoachServiceId(), "Séance"));
                })
                .toList();
    }

    private void requireCoach(User user) {
        permissionService.require(user, Permissions.COACHING_MANAGE);
    }

    private void requireClient(User user) {
        permissionService.require(user, Permissions.COACHING_DISCOVER);
    }

    private String invoiceNumber() {
        return "CB-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private BookingDto toDto(CoachingBooking booking, User coach, User client, String serviceName) {
        boolean reviewed = reviewRepository.existsByCoachIdAndClientId(booking.getCoachId(), booking.getClientId());
        return new BookingDto(
                booking.getId(),
                booking.getCoachId(),
                coach == null ? null : coach.getDisplayName(),
                booking.getClientId(),
                client == null ? null : client.getDisplayName(),
                booking.getCoachServiceId(),
                serviceName,
                booking.getScheduledAt(),
                booking.getDurationMinutes(),
                booking.getStatus().name(),
                booking.getPriceAmount(),
                booking.getPriceCurrency(),
                booking.getPackId(),
                reviewed,
                booking.getCreatedAt(),
                readSlots(booking.getSuggestedSlotsJson())
        );
    }
}
