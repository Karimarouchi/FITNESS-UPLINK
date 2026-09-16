package com.fitnessuplink.coaching;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachPackOfferDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachingPackDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.PurchasePackRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.UpsertPackOfferRequest;
import com.fitnessuplink.billing.ChargeResult;
import com.fitnessuplink.billing.PaymentProvider;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CoachingPackService {

    private final CoachPackOfferRepository offerRepository;
    private final CoachingPackRepository packRepository;
    private final CoachingPaymentRepository paymentRepository;
    private final CoachSearchService coachSearchService;
    private final CoachingCommissionService coachingCommissionService;
    private final UserRepository userRepository;
    private final PaymentProvider paymentProvider;
    private final NotificationService notificationService;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public List<CoachPackOfferDto> offers(UUID coachId) {
        return offerRepository.findByCoachIdAndActiveTrueOrderByCreatedAtDesc(coachId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CoachPackOfferDto> myOffers(User coach) {
        requireCoach(coach);
        return offerRepository.findByCoachIdOrderByCreatedAtDesc(coach.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public CoachPackOfferDto createOffer(User coach, UpsertPackOfferRequest request) {
        requireCoach(coach);
        CoachPackType type = parseType(request.packType());
        Instant now = Instant.now();
        CoachPackOffer offer = CoachPackOffer.builder()
                .id(UUID.randomUUID())
                .coachId(coach.getId())
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        apply(offer, type, request);
        return toDto(offerRepository.save(offer));
    }

    @Transactional
    public CoachPackOfferDto updateOffer(User coach, UUID id, UpsertPackOfferRequest request) {
        requireCoach(coach);
        CoachPackOffer offer = offerRepository.findByIdAndCoachId(id, coach.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PACK_OFFER_NOT_FOUND"));
        apply(offer, parseType(request.packType()), request);
        offer.setUpdatedAt(Instant.now());
        return toDto(offerRepository.save(offer));
    }

    @Transactional
    public void deleteOffer(User coach, UUID id) {
        requireCoach(coach);
        CoachPackOffer offer = offerRepository.findByIdAndCoachId(id, coach.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PACK_OFFER_NOT_FOUND"));
        offerRepository.delete(offer);
    }

    @Transactional
    public CoachingPackDto purchase(User client, PurchasePackRequest request) {
        requireClient(client);
        CoachPackOffer offer = offerRepository.findById(request.offerId())
                .filter(CoachPackOffer::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PACK_OFFER_NOT_FOUND"));
        User coach = coachSearchService.requireCoach(offer.getCoachId());

        ChargeResult result = paymentProvider.charge(request.cardNumber(), offer.getPriceAmount(), offer.getPriceCurrency());
        Instant now = Instant.now();
        var commissionRate = coachingCommissionService.currentRate();
        CoachingPayment payment = CoachingPayment.builder()
                .id(UUID.randomUUID())
                .clientId(client.getId())
                .coachId(coach.getId())
                .amount(offer.getPriceAmount())
                .currency(offer.getPriceCurrency())
                .status(result.success() ? CoachingPaymentStatus.SUCCEEDED : CoachingPaymentStatus.FAILED)
                .provider(result.provider())
                .providerRef(result.reference())
                .invoiceNumber(invoiceNumber())
                .invoiceHtml(invoiceHtml(client, coach, "Pack " + offer.getPackType(), offer.getPriceAmount(), offer.getPriceCurrency()))
                .commissionRate(commissionRate)
                .commissionAmount(coachingCommissionService.amountFor(offer.getPriceAmount(), commissionRate))
                .createdAt(now)
                .build();
        paymentRepository.save(payment);
        if (!result.success()) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "PAYMENT_FAILED");
        }

        int sessionsTotal = offer.getPackType() == CoachPackType.MONTHLY
                ? (offer.getSessionCount() == null ? 30 : offer.getSessionCount())
                : (offer.getSessionCount() == null ? 1 : offer.getSessionCount());
        CoachingPack pack = CoachingPack.builder()
                .id(UUID.randomUUID())
                .coachId(coach.getId())
                .clientId(client.getId())
                .offerId(offer.getId())
                .sessionsTotal(sessionsTotal)
                .sessionsUsed(0)
                .priceAmount(offer.getPriceAmount())
                .priceCurrency(offer.getPriceCurrency())
                .status(CoachingPackStatus.ACTIVE)
                .purchasedAt(now)
                .expiresAt(offer.getValidityDays() == null ? null : now.plusSeconds(offer.getValidityDays() * 86400L))
                .paymentId(payment.getId())
                .build();
        packRepository.save(pack);

        notificationService.notify(client.getId(), NotifyCategory.CONTACT,
                "Pack acheté", "Votre pack de " + sessionsTotal + " séance(s) avec " + coach.getDisplayName() + " est actif.",
                "Voir", "/app/coaching/packs");
        notificationService.notify(coach.getId(), NotifyCategory.CONTACT,
                "Nouveau pack vendu", client.getDisplayName() + " a acheté un pack.", "Voir", "/app/coaching/packs");

        return toDto(pack, coach.getDisplayName());
    }

    @Transactional(readOnly = true)
    public List<CoachingPackDto> myPacks(User client) {
        requireClient(client);
        Map<UUID, User> coaches = coachesOf(packRepository.findByClientIdOrderByPurchasedAtDesc(client.getId()));
        return packRepository.findByClientIdOrderByPurchasedAtDesc(client.getId()).stream()
                .map(p -> toDto(p, coaches.getOrDefault(p.getCoachId(), null) == null ? "Coach" : coaches.get(p.getCoachId()).getDisplayName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CoachingPackDto> soldPacks(User coach) {
        requireCoach(coach);
        Map<UUID, User> clients = coachesOf(packRepository.findByCoachIdOrderByPurchasedAtDesc(coach.getId()));
        return packRepository.findByCoachIdOrderByPurchasedAtDesc(coach.getId()).stream()
                .map(p -> toDto(p, clients.getOrDefault(p.getClientId(), null) == null ? "Client" : clients.get(p.getClientId()).getDisplayName()))
                .toList();
    }

    java.util.Optional<CoachingPack> findUsablePack(UUID clientId, UUID coachId) {
        return packRepository.findByClientIdOrderByPurchasedAtDesc(clientId).stream()
                .filter(pack -> pack.getCoachId().equals(coachId))
                .filter(pack -> pack.getStatus() == CoachingPackStatus.ACTIVE)
                .filter(pack -> pack.getExpiresAt() == null || !pack.getExpiresAt().isBefore(Instant.now()))
                .filter(pack -> pack.sessionsRemaining() > 0)
                .findFirst();
    }

    CoachingPack requireUsablePack(UUID packId, UUID clientId, UUID coachId) {
        CoachingPack pack = packRepository.findByIdAndClientId(packId, clientId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PACK_NOT_FOUND"));
        if (!pack.getCoachId().equals(coachId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PACK_WRONG_COACH");
        }
        if (pack.getStatus() != CoachingPackStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "PACK_NOT_ACTIVE");
        }
        if (pack.getExpiresAt() != null && pack.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.CONFLICT, "PACK_EXPIRED");
        }
        if (pack.sessionsRemaining() <= 0) {
            throw new ApiException(HttpStatus.CONFLICT, "PACK_EXHAUSTED");
        }
        return pack;
    }

    void consumeSession(CoachingPack pack) {
        pack.setSessionsUsed(pack.getSessionsUsed() + 1);
        if (pack.sessionsRemaining() <= 0) {
            pack.setStatus(CoachingPackStatus.EXHAUSTED);
        }
        packRepository.save(pack);
    }

    void releaseSession(CoachingPack pack) {
        pack.setSessionsUsed(Math.max(0, pack.getSessionsUsed() - 1));
        if (pack.getStatus() == CoachingPackStatus.EXHAUSTED && pack.sessionsRemaining() > 0) {
            pack.setStatus(CoachingPackStatus.ACTIVE);
        }
        packRepository.save(pack);
    }

    @Transactional
    void releaseSessionById(UUID packId) {
        packRepository.findById(packId).ifPresent(this::releaseSession);
    }

    private Map<UUID, User> coachesOf(List<CoachingPack> packs) {
        List<UUID> ids = packs.stream().map(p -> p.getCoachId()).distinct().toList();
        List<UUID> clientIds = packs.stream().map(p -> p.getClientId()).distinct().toList();
        List<UUID> all = new java.util.ArrayList<>(ids);
        all.addAll(clientIds);
        return userRepository.findByIdIn(all).stream().collect(Collectors.toMap(User::getId, u -> u));
    }

    private void requireCoach(User user) {
        permissionService.require(user, Permissions.COACHING_MANAGE);
    }

    private void requireClient(User user) {
        permissionService.require(user, Permissions.COACHING_DISCOVER);
    }

    private CoachPackType parseType(String value) {
        try {
            return CoachPackType.valueOf(value == null ? "" : value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PACK_TYPE_INVALID");
        }
    }

    private void apply(CoachPackOffer offer, CoachPackType type, UpsertPackOfferRequest request) {
        BigDecimal price = request.priceAmount();
        if (price == null || price.signum() < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PACK_PRICE_INVALID");
        }
        String currency = request.priceCurrency() == null ? "" : request.priceCurrency().trim().toUpperCase();
        if (currency.length() != 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PACK_CURRENCY_INVALID");
        }
        offer.setPackType(type);
        offer.setSessionCount(request.sessionCount());
        offer.setPriceAmount(price);
        offer.setPriceCurrency(currency);
        offer.setValidityDays(request.validityDays());
        if (request.active() != null) {
            offer.setActive(request.active());
        }
    }

    private String invoiceNumber() {
        return "CO-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private String invoiceHtml(User client, User coach, String label, BigDecimal amount, String currency) {
        return """
                <html><body style="font-family:Segoe UI,Arial,sans-serif;color:#141a32">
                <h1>Facture coaching</h1>
                <p>Fitness Uplink</p>
                <p>%s<br>%s</p>
                <p>Coach : %s<br>Prestation : %s<br><strong>Total : %s %s</strong></p>
                </body></html>
                """.formatted(
                escapeHtml(client.getDisplayName()),
                escapeHtml(client.getEmail()),
                escapeHtml(coach.getDisplayName()),
                escapeHtml(label),
                amount,
                currency
        );
    }

    static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private CoachPackOfferDto toDto(CoachPackOffer offer) {
        return new CoachPackOfferDto(
                offer.getId(),
                offer.getPackType().name(),
                offer.getSessionCount(),
                offer.getPriceAmount(),
                offer.getPriceCurrency(),
                offer.getValidityDays(),
                offer.isActive()
        );
    }

    private CoachingPackDto toDto(CoachingPack pack, String coachDisplayName) {
        return new CoachingPackDto(
                pack.getId(),
                pack.getCoachId(),
                coachDisplayName,
                pack.getOfferId(),
                offerRepository.findById(pack.getOfferId()).map(o -> o.getPackType().name()).orElse("CUSTOM"),
                pack.getSessionsTotal(),
                pack.getSessionsUsed(),
                pack.sessionsRemaining(),
                pack.getPriceAmount(),
                pack.getPriceCurrency(),
                pack.getStatus().name(),
                pack.getPurchasedAt(),
                pack.getExpiresAt()
        );
    }
}
