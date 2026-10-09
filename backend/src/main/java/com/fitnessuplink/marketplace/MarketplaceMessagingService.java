package com.fitnessuplink.marketplace;

import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ConversationDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ConversationRefDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ConversationThreadDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.CounterpartDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.MarketplaceMessageDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.SendMarketplaceMessageRequest;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.SupplierSummaryDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.UnreadCountDto;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarketplaceMessagingService {

    private static final int MAX_BODY = 4000;
    private static final int PREVIEW = 280;

    private final MarketplaceConversationRepository conversationRepository;
    private final MarketplaceMessageRepository messageRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;
    private final ProductCatalogService catalogService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public ConversationDto contactSupplier(User buyer, UUID productId, SendMarketplaceMessageRequest request) {
        requireReady(buyer);
        String body = validBody(request);
        Product product = productRepository.findById(productId)
                .filter(Product::isPubliclyVisible)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));
        if (product.getSupplierId().equals(buyer.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_CONTACT_SELF");
        }
        Instant now = Instant.now();
        MarketplaceConversation conversation = conversationRepository
                .findByProductIdAndBuyerId(productId, buyer.getId())
                .orElseGet(() -> MarketplaceConversation.builder()
                        .id(UUID.randomUUID())
                        .productId(product.getId())
                        .productName(product.getName())
                        .buyerId(buyer.getId())
                        .supplierId(product.getSupplierId())
                        .createdAt(now)
                        .lastMessageAt(now)
                        .build());
        appendMessage(conversation, buyer, body, now);
        return toDto(conversation, buyer.getId(), 0);
    }

    @Transactional(readOnly = true)
    public ConversationRefDto conversationFor(User buyer, UUID productId) {
        if (buyer == null) {
            return new ConversationRefDto(null);
        }
        return new ConversationRefDto(conversationRepository.findByProductIdAndBuyerId(productId, buyer.getId())
                .map(MarketplaceConversation::getId)
                .orElse(null));
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> list(User user) {
        List<MarketplaceConversation> conversations = conversationRepository.findForUser(user.getId());
        Map<UUID, Long> unread = unreadMap(user.getId());
        Context context = context(conversations);
        return conversations.stream()
                .map(c -> toDto(c, user.getId(), unread.getOrDefault(c.getId(), 0L), context))
                .toList();
    }

    @Transactional
    public ConversationThreadDto thread(User user, UUID conversationId) {
        MarketplaceConversation conversation = requireParticipant(user, conversationId);
        markRead(conversation, user.getId());
        List<MarketplaceMessage> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        Map<UUID, String> names = userRepository.findByIdIn(Set.of(conversation.getBuyerId(), conversation.getSupplierId()))
                .stream().collect(Collectors.toMap(User::getId, User::getDisplayName));
        List<MarketplaceMessageDto> items = messages.stream()
                .map(m -> new MarketplaceMessageDto(
                        m.getId(),
                        m.getSenderId(),
                        names.getOrDefault(m.getSenderId(), "Utilisateur"),
                        m.getSenderId().equals(user.getId()),
                        m.getBody(),
                        m.getCreatedAt()))
                .toList();
        return new ConversationThreadDto(toDto(conversation, user.getId(), 0), items);
    }

    @Transactional
    public MarketplaceMessageDto send(User sender, UUID conversationId, SendMarketplaceMessageRequest request) {
        MarketplaceConversation conversation = requireParticipant(sender, conversationId);
        String body = validBody(request);
        MarketplaceMessage message = appendMessage(conversation, sender, body, Instant.now());
        return new MarketplaceMessageDto(message.getId(), sender.getId(), sender.getDisplayName(), true, body, message.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public UnreadCountDto unreadCount(User user) {
        return new UnreadCountDto(unreadMap(user.getId()).size());
    }

    private MarketplaceMessage appendMessage(MarketplaceConversation conversation, User sender, String body, Instant now) {
        conversation.setLastMessageAt(now);
        conversation.setLastMessagePreview(body.length() > PREVIEW ? body.substring(0, PREVIEW - 1) + "…" : body);
        if (conversation.isSupplier(sender.getId())) {
            conversation.setSupplierLastReadAt(now);
        } else {
            conversation.setBuyerLastReadAt(now);
        }
        conversationRepository.save(conversation);
        MarketplaceMessage message = messageRepository.save(MarketplaceMessage.builder()
                .id(UUID.randomUUID())
                .conversationId(conversation.getId())
                .senderId(sender.getId())
                .body(body)
                .createdAt(now)
                .build());
        boolean fromSupplier = conversation.isSupplier(sender.getId());
        UUID recipient = fromSupplier ? conversation.getBuyerId() : conversation.getSupplierId();
        notificationService.notify(recipient, NotifyCategory.MESSAGE,
                fromSupplier ? "Réponse du fournisseur" : "Nouveau message marketplace",
                sender.getDisplayName() + " · " + conversation.getProductName(),
                "Ouvrir la conversation",
                "/app/marketplace/messages?c=" + conversation.getId());
        return message;
    }

    private void markRead(MarketplaceConversation conversation, UUID userId) {
        Instant now = Instant.now();
        if (conversation.isSupplier(userId)) {
            conversation.setSupplierLastReadAt(now);
        } else {
            conversation.setBuyerLastReadAt(now);
        }
        conversationRepository.save(conversation);
    }

    private MarketplaceConversation requireParticipant(User user, UUID conversationId) {
        return conversationRepository.findById(conversationId)
                .filter(c -> c.involves(user.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND"));
    }

    private void requireReady(User user) {
        if (!user.isSuperAdmin() && !user.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ONBOARDING_REQUIRED");
        }
    }

    private String validBody(SendMarketplaceMessageRequest request) {
        String body = request == null || request.body() == null ? "" : request.body().trim();
        if (body.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_EMPTY");
        }
        if (body.length() > MAX_BODY) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_TOO_LONG");
        }
        return body;
    }

    private Map<UUID, Long> unreadMap(UUID userId) {
        return messageRepository.unreadPerConversation(userId).stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> ((Number) row[1]).longValue()));
    }

    private record Context(Map<UUID, Product> products, Map<UUID, User> users, Map<UUID, SupplierSummaryDto> suppliers) {
    }

    private Context context(List<MarketplaceConversation> conversations) {
        Set<UUID> productIds = conversations.stream()
                .map(MarketplaceConversation::getProductId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Set<UUID> userIds = new HashSet<>();
        Set<UUID> supplierIds = new HashSet<>();
        for (MarketplaceConversation c : conversations) {
            userIds.add(c.getBuyerId());
            userIds.add(c.getSupplierId());
            supplierIds.add(c.getSupplierId());
        }
        Map<UUID, Product> products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        Map<UUID, User> users = userRepository.findByIdIn(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        Map<UUID, SupplierSummaryDto> suppliers = supplierIds.stream()
                .filter(users::containsKey)
                .collect(Collectors.toMap(Function.identity(), id -> catalogService.supplierSummary(users.get(id))));
        return new Context(products, users, suppliers);
    }

    private ConversationDto toDto(MarketplaceConversation conversation, UUID viewerId, long unread) {
        return toDto(conversation, viewerId, unread, context(List.of(conversation)));
    }

    private ConversationDto toDto(MarketplaceConversation c, UUID viewerId, long unread, Context context) {
        boolean viewerIsSupplier = c.isSupplier(viewerId);
        Product product = c.getProductId() == null ? null : context.products().get(c.getProductId());
        List<UUID> photos = product == null ? List.of() : productService.readUploadIds(product.getPhotosJson());
        CounterpartDto counterpart;
        if (viewerIsSupplier) {
            User buyer = context.users().get(c.getBuyerId());
            counterpart = new CounterpartDto(
                    c.getBuyerId(),
                    buyer == null ? "Utilisateur" : buyer.getDisplayName(),
                    buyer == null || buyer.getAppRole() == null ? null : buyer.getAppRole().getLabel());
        } else {
            SupplierSummaryDto supplier = context.suppliers().get(c.getSupplierId());
            counterpart = new CounterpartDto(
                    c.getSupplierId(),
                    supplier == null ? "Fournisseur" : supplier.displayName(),
                    supplier == null || supplier.city() == null ? "Fournisseur" : "Fournisseur · " + supplier.city());
        }
        return new ConversationDto(
                c.getId(),
                c.getProductId(),
                c.getProductName(),
                photos.isEmpty() ? null : photos.get(0),
                product == null ? null : product.getPriceAmount(),
                product == null ? null : product.getPriceCurrency(),
                product != null && product.isPubliclyVisible(),
                viewerIsSupplier ? "SUPPLIER" : "BUYER",
                counterpart,
                c.getLastMessagePreview(),
                c.getLastMessageAt(),
                unread
        );
    }
}
