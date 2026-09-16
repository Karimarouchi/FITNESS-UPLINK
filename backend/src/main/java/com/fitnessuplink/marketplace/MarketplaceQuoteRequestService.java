package com.fitnessuplink.marketplace;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.auth.mail.MailProperties;
import com.fitnessuplink.auth.token.TokenHasher;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ConfirmQuoteRequest;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.CreateQuoteRequest;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.QuoteRequestStatusDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ReceivedQuoteRequestDto;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarketplaceQuoteRequestService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");

    private final MarketplaceQuoteRequestRepository quoteRequestRepository;
    private final ProductRepository productRepository;
    private final ProductCatalogService productCatalogService;
    private final UserRepository userRepository;
    private final TokenHasher tokenHasher;
    private final MailProperties mailProperties;
    private final MarketplaceMailService marketplaceMailService;
    private final NotificationService notificationService;
    private final PermissionService permissionService;

    @Transactional
    public QuoteRequestStatusDto create(UUID productId, CreateQuoteRequest request) {
        Product product = productCatalogService.requireVisible(productId);
        String email = request.email() == null ? "" : request.email().trim().toLowerCase();
        String fullName = request.fullName() == null ? "" : request.fullName().trim();
        String message = request.message() == null ? "" : request.message().trim();
        if (!EMAIL_PATTERN.matcher(email).matches() || fullName.isBlank() || message.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REQUEST_INCOMPLETE");
        }

        String code = tokenHasher.newNumericCode(6);
        Instant now = Instant.now();
        MarketplaceQuoteRequest entity = MarketplaceQuoteRequest.builder()
                .id(UUID.randomUUID())
                .productId(product.getId())
                .supplierId(product.getSupplierId())
                .email(email)
                .fullName(fullName)
                .phone(request.phone() == null || request.phone().isBlank() ? null : request.phone().trim())
                .message(message)
                .codeHash(tokenHasher.sha256(code))
                .codeExpiresAt(now.plus(mailProperties.codeTtl()))
                .attempts(0)
                .status(MarketplaceQuoteStatus.PENDING_VERIFICATION)
                .createdAt(now)
                .build();
        quoteRequestRepository.save(entity);

        marketplaceMailService.sendGuestVerification(email, fullName, product.getName(), entity.getId(), code);
        return new QuoteRequestStatusDto(entity.getId(), entity.getStatus().name());
    }

    @Transactional
    public QuoteRequestStatusDto confirm(UUID id, ConfirmQuoteRequest request) {
        MarketplaceQuoteRequest entity = quoteRequestRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND"));
        if (entity.getStatus() != MarketplaceQuoteStatus.PENDING_VERIFICATION) {
            return new QuoteRequestStatusDto(entity.getId(), entity.getStatus().name());
        }
        String rawCode = request == null || request.code() == null ? "" : request.code().trim();
        if (entity.getAttempts() >= mailProperties.maxAttempts() || Instant.now().isAfter(entity.getCodeExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CODE_INVALID");
        }
        if (!tokenHasher.sha256(rawCode).equals(entity.getCodeHash())) {
            entity.setAttempts(entity.getAttempts() + 1);
            quoteRequestRepository.save(entity);
            throw new ApiException(HttpStatus.BAD_REQUEST, "CODE_INVALID");
        }

        entity.setStatus(MarketplaceQuoteStatus.SENT);
        entity.setVerifiedAt(Instant.now());
        quoteRequestRepository.save(entity);

        Product product = productRepository.findById(entity.getProductId()).orElse(null);
        User supplier = userRepository.findById(entity.getSupplierId()).orElse(null);
        if (supplier != null) {
            notificationService.notify(supplier.getId(), NotifyCategory.CONTACT,
                    "Nouvelle demande de devis", entity.getFullName() + " souhaite un devis.",
                    "Voir", "/app/marketplace/requests");
            marketplaceMailService.notifySupplier(supplier, entity.getFullName(), product == null ? "un produit" : product.getName());
        }
        return new QuoteRequestStatusDto(entity.getId(), entity.getStatus().name());
    }

    @Transactional
    public void resend(UUID id) {
        MarketplaceQuoteRequest entity = quoteRequestRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND"));
        if (entity.getStatus() != MarketplaceQuoteStatus.PENDING_VERIFICATION) {
            throw new ApiException(HttpStatus.CONFLICT, "REQUEST_ALREADY_HANDLED");
        }
        Instant now = Instant.now();
        Instant retryAt = entity.getCreatedAt().plus(mailProperties.resendCooldown());
        if (now.isBefore(retryAt)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Un code a déjà été envoyé. Réessayez dans un instant.");
        }
        String code = tokenHasher.newNumericCode(6);
        entity.setCodeHash(tokenHasher.sha256(code));
        entity.setCodeExpiresAt(now.plus(mailProperties.codeTtl()));
        entity.setAttempts(0);
        quoteRequestRepository.save(entity);
        Product product = productRepository.findById(entity.getProductId()).orElse(null);
        marketplaceMailService.sendGuestVerification(entity.getEmail(), entity.getFullName(), product == null ? "ce produit" : product.getName(), entity.getId(), code);
    }

    @Transactional(readOnly = true)
    public List<ReceivedQuoteRequestDto> received(User supplier) {
        permissionService.require(supplier, Permissions.MARKETPLACE_MANAGE);
        List<MarketplaceQuoteRequest> rows = quoteRequestRepository.findBySupplierIdOrderByCreatedAtDesc(supplier.getId()).stream()
                .filter(r -> r.getStatus() != MarketplaceQuoteStatus.PENDING_VERIFICATION)
                .toList();
        Map<UUID, String> productNames = productRepository.findAllById(rows.stream().map(MarketplaceQuoteRequest::getProductId).distinct().toList())
                .stream().collect(Collectors.toMap(Product::getId, Product::getName));
        return rows.stream()
                .map(r -> toDto(r, productNames.getOrDefault(r.getProductId(), "—")))
                .toList();
    }

    @Transactional
    public ReceivedQuoteRequestDto markHandled(User supplier, UUID id) {
        permissionService.require(supplier, Permissions.MARKETPLACE_MANAGE);
        MarketplaceQuoteRequest entity = quoteRequestRepository.findByIdAndSupplierId(id, supplier.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND"));
        entity.setStatus(MarketplaceQuoteStatus.HANDLED);
        entity.setHandledAt(Instant.now());
        quoteRequestRepository.save(entity);
        String productName = productRepository.findById(entity.getProductId()).map(Product::getName).orElse("—");
        return toDto(entity, productName);
    }

    private ReceivedQuoteRequestDto toDto(MarketplaceQuoteRequest entity, String productName) {
        return new ReceivedQuoteRequestDto(
                entity.getId(),
                entity.getProductId(),
                productName,
                entity.getEmail(),
                entity.getFullName(),
                entity.getPhone(),
                entity.getMessage(),
                entity.getStatus().name(),
                entity.getCreatedAt(),
                entity.getHandledAt()
        );
    }
}
