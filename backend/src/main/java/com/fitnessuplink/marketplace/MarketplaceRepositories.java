package com.fitnessuplink.marketplace;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface ProductCategoryRepository extends JpaRepository<ProductCategory, UUID> {
    List<ProductCategory> findAllByOrderBySortOrderAsc();

    List<ProductCategory> findByActiveTrueOrderBySortOrderAsc();
}

interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findBySupplierIdOrderByCreatedAtDesc(UUID supplierId);

    List<Product> findBySupplierIdAndActiveTrueOrderByCreatedAtDesc(UUID supplierId);

    Optional<Product> findByIdAndSupplierId(UUID id, UUID supplierId);

    long countByCategoryIdAndActiveTrue(UUID categoryId);

    long countByActiveTrueAndHiddenByAdminFalse();

    long countByHiddenByAdminTrue();

    long countByActiveFalse();

    @Query("""
            SELECT p.id FROM Product p
            WHERE p.active = TRUE
              AND p.hiddenByAdmin = FALSE
              AND (:categoryId IS NULL OR p.categoryId = :categoryId)
              AND (:condition = '' OR p.itemCondition = :condition)
              AND (:q = ''
                   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.brand, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY p.createdAt DESC
            """)
    Page<UUID> search(
            @Param("categoryId") UUID categoryId,
            @Param("condition") String condition,
            @Param("q") String q,
            Pageable pageable
    );

    @Query("""
            SELECT p FROM Product p
            WHERE (:categoryId IS NULL OR p.categoryId = :categoryId)
              AND (:supplierId IS NULL OR p.supplierId = :supplierId)
              AND (:q = ''
                   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.brand, '')) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:status = 'ALL'
                   OR (:status = 'VISIBLE' AND p.active = TRUE AND p.hiddenByAdmin = FALSE)
                   OR (:status = 'HIDDEN' AND p.hiddenByAdmin = TRUE)
                   OR (:status = 'INACTIVE' AND p.active = FALSE))
            ORDER BY p.createdAt DESC
            """)
    Page<Product> adminSearch(
            @Param("categoryId") UUID categoryId,
            @Param("supplierId") UUID supplierId,
            @Param("status") String status,
            @Param("q") String q,
            Pageable pageable
    );

    @Query("SELECT p.supplierId, COUNT(p), SUM(CASE WHEN p.active = TRUE AND p.hiddenByAdmin = FALSE THEN 1 ELSE 0 END), "
            + "SUM(CASE WHEN p.hiddenByAdmin = TRUE THEN 1 ELSE 0 END) FROM Product p GROUP BY p.supplierId")
    List<Object[]> countsPerSupplier();

    @Modifying
    @Query("UPDATE Product p SET p.viewCount = p.viewCount + 1 WHERE p.id = :id")
    void incrementViews(@Param("id") UUID id);
}

interface MarketplaceQuoteRequestRepository extends JpaRepository<MarketplaceQuoteRequest, UUID> {
    List<MarketplaceQuoteRequest> findBySupplierIdOrderByCreatedAtDesc(UUID supplierId);

    Optional<MarketplaceQuoteRequest> findByIdAndSupplierId(UUID id, UUID supplierId);
}

interface MarketplaceConversationRepository extends JpaRepository<MarketplaceConversation, UUID> {
    Optional<MarketplaceConversation> findByProductIdAndBuyerId(UUID productId, UUID buyerId);

    @Query("""
            SELECT c FROM MarketplaceConversation c
            WHERE c.buyerId = :userId OR c.supplierId = :userId
            ORDER BY c.lastMessageAt DESC
            """)
    List<MarketplaceConversation> findForUser(@Param("userId") UUID userId);

    long countBySupplierId(UUID supplierId);

    long countByCreatedAtAfter(Instant since);

    @Query("SELECT c.productId, COUNT(c) FROM MarketplaceConversation c WHERE c.productId IN :ids GROUP BY c.productId")
    List<Object[]> countPerProduct(@Param("ids") Collection<UUID> ids);

    @Query("SELECT c.supplierId, COUNT(c) FROM MarketplaceConversation c GROUP BY c.supplierId")
    List<Object[]> countPerSupplier();
}

interface MarketplaceMessageRepository extends JpaRepository<MarketplaceMessage, UUID> {
    List<MarketplaceMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    @Query("""
            SELECT m.conversationId, COUNT(m) FROM MarketplaceMessage m, MarketplaceConversation c
            WHERE m.conversationId = c.id
              AND m.senderId <> :userId
              AND ((c.buyerId = :userId AND (c.buyerLastReadAt IS NULL OR m.createdAt > c.buyerLastReadAt))
                OR (c.supplierId = :userId AND (c.supplierLastReadAt IS NULL OR m.createdAt > c.supplierLastReadAt)))
            GROUP BY m.conversationId
            """)
    List<Object[]> unreadPerConversation(@Param("userId") UUID userId);
}
