package com.fitnessuplink.marketplace;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.audit.AuditAction;
import com.fitnessuplink.audit.AuditLogService;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.AdminMarketplaceStatsDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.AdminProductPageDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.AdminProductRowDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.AdminSupplierRowDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.SupplierSummaryDto;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarketplaceAdminService {

    private static final String SUPPLIER_ROLE = "SUPPLIER";
    private static final Set<String> STATUSES = Set.of("ALL", "VISIBLE", "HIDDEN", "INACTIVE");

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final MarketplaceConversationRepository conversationRepository;
    private final ProductService productService;
    private final ProductCatalogService catalogService;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public AdminMarketplaceStatsDto stats(User admin) {
        requireAdmin(admin);
        long suppliers = userRepository.findByAppRole_Code(SUPPLIER_ROLE).size();
        long activeSuppliers = productRepository.countsPerSupplier().stream()
                .filter(row -> ((Number) row[2]).longValue() > 0)
                .count();
        return new AdminMarketplaceStatsDto(
                productRepository.count(),
                productRepository.countByActiveTrueAndHiddenByAdminFalse(),
                productRepository.countByHiddenByAdminTrue(),
                productRepository.countByActiveFalse(),
                suppliers,
                activeSuppliers,
                conversationRepository.count(),
                conversationRepository.countByCreatedAtAfter(Instant.now().minus(Duration.ofDays(7)))
        );
    }

    @Transactional(readOnly = true)
    public AdminProductPageDto products(User admin, String q, String status, UUID categoryId, UUID supplierId, int page, int size) {
        requireAdmin(admin);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        String safeStatus = status == null ? "ALL" : status.trim().toUpperCase();
        if (!STATUSES.contains(safeStatus)) {
            safeStatus = "ALL";
        }
        String safeQ = q == null || q.isBlank() ? "" : q.trim();
        Page<Product> result = productRepository.adminSearch(categoryId, supplierId, safeStatus, safeQ, PageRequest.of(safePage, safeSize));
        List<Product> products = result.getContent();

        Map<UUID, String> categories = categoryRepository.findAllById(products.stream().map(Product::getCategoryId).distinct().toList())
                .stream().collect(Collectors.toMap(ProductCategory::getId, ProductCategory::getName));
        Map<UUID, User> suppliers = userRepository.findByIdIn(products.stream().map(Product::getSupplierId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<UUID, Long> conversations = products.isEmpty() ? Map.of() : conversationRepository
                .countPerProduct(products.stream().map(Product::getId).toList())
                .stream().collect(Collectors.toMap(row -> (UUID) row[0], row -> ((Number) row[1]).longValue()));

        List<AdminProductRowDto> items = products.stream()
                .map(p -> toRow(p, categories.getOrDefault(p.getCategoryId(), "â€”"), suppliers.get(p.getSupplierId()),
                        conversations.getOrDefault(p.getId(), 0L)))
                .toList();
        return new AdminProductPageDto(items, result.getTotalElements(), safePage, safeSize);
    }

    @Transactional
    public AdminProductRowDto hide(User admin, UUID productId, String reason) {
        requireAdmin(admin);
        String safeReason = reason == null ? "" : reason.trim();
        if (safeReason.isEmpty() || safeReason.length() > 500) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "HIDE_REASON_REQUIRED");
        }
        Product product = requireProduct(productId);
        product.setHiddenByAdmin(true);
        product.setHiddenReason(safeReason);
        product.setHiddenAt(Instant.now());
        productRepository.save(product);
        notificationService.notify(product.getSupplierId(), NotifyCategory.MESSAGE,
                "Article masquÃ© par la modÃ©ration",
                "Â« " + product.getName() + " Â» n'est plus visible : " + safeReason,
                "Voir mes articles", "/app/marketplace/mine");
        auditLogService.record(admin.getId(), product.getSupplierId(), AuditAction.MARKETPLACE_PRODUCT_HIDDEN, "PRODUCT", product.getId(), safeReason);
        return rowOf(product);
    }

    @Transactional
    public AdminProductRowDto unhide(User admin, UUID productId) {
        requireAdmin(admin);
        Product product = requireProduct(productId);
        product.setHiddenByAdmin(false);
        product.setHiddenReason(null);
        product.setHiddenAt(null);
        productRepository.save(product);
        notificationService.notify(product.getSupplierId(), NotifyCategory.MESSAGE,
                "Article rÃ©tabli",
                "Â« " + product.getName() + " Â» est de nouveau visible sur le marketplace.",
                "Voir mes articles", "/app/marketplace/mine");
        auditLogService.record(admin.getId(), product.getSupplierId(), AuditAction.MARKETPLACE_PRODUCT_RESTORED, "PRODUCT", product.getId(), null);
        return rowOf(product);
    }

    @Transactional(readOnly = true)
    public List<AdminSupplierRowDto> suppliers(User admin) {
        requireAdmin(admin);
        List<User> suppliers = userRepository.findByAppRole_Code(SUPPLIER_ROLE);
        Map<UUID, long[]> counts = new HashMap<>();
        for (Object[] row : productRepository.countsPerSupplier()) {
            counts.put((UUID) row[0], new long[]{
                    ((Number) row[1]).longValue(), ((Number) row[2]).longValue(), ((Number) row[3]).longValue()});
        }
        Map<UUID, Long> conversations = conversationRepository.countPerSupplier().stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> ((Number) row[1]).longValue()));
        return suppliers.stream()
                .map(u -> {
                    SupplierSummaryDto summary = catalogService.supplierSummary(u);
                    long[] c = counts.getOrDefault(u.getId(), new long[]{0, 0, 0});
                    return new AdminSupplierRowDto(
                            u.getId(),
                            summary.displayName(),
                            u.getEmail(),
                            summary.city(),
                            u.isEnabled(),
                            c[0], c[1], c[2],
                            conversations.getOrDefault(u.getId(), 0L),
                            u.getCreatedAt());
                })
                .sorted(Comparator.comparingLong(AdminSupplierRowDto::productCount).reversed())
                .toList();
    }

    private AdminProductRowDto rowOf(Product product) {
        String category = categoryRepository.findById(product.getCategoryId()).map(ProductCategory::getName).orElse("â€”");
        User supplier = userRepository.findById(product.getSupplierId()).orElse(null);
        long conversations = conversationRepository.countPerProduct(List.of(product.getId())).stream()
                .findFirst().map(row -> ((Number) row[1]).longValue()).orElse(0L);
        return toRow(product, category, supplier, conversations);
    }

    private AdminProductRowDto toRow(Product p, String categoryName, User supplier, long conversations) {
        List<UUID> photos = productService.readUploadIds(p.getPhotosJson());
        SupplierSummaryDto summary = supplier == null ? null : catalogService.supplierSummary(supplier);
        return new AdminProductRowDto(
                p.getId(),
                p.getName(),
                p.getBrand(),
                p.getCategoryId(),
                categoryName,
                p.getPriceAmount(),
                p.getPriceCurrency(),
                p.getItemCondition(),
                photos.isEmpty() ? null : photos.get(0),
                p.getSupplierId(),
                summary == null ? "â€”" : summary.displayName(),
                supplier == null ? null : supplier.getEmail(),
                p.isActive(),
                p.isHiddenByAdmin(),
                p.getHiddenReason(),
                p.getHiddenAt(),
                p.getViewCount(),
                conversations,
                p.getCreatedAt()
        );
    }

    private Product requireProduct(UUID id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));
    }

    private void requireAdmin(User admin) {
        if (admin.isSuperAdmin()) {
            return;
        }
        permissionService.require(admin, Permissions.ADMIN_MODULES);
    }
}
