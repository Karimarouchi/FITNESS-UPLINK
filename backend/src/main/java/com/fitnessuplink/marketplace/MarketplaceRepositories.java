package com.fitnessuplink.marketplace;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
            SELECT p.id FROM Product p
            WHERE p.active = TRUE
              AND (:categoryId IS NULL OR p.categoryId = :categoryId)
              AND (:q = ''
                   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.brand, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY p.createdAt DESC
            """)
    Page<UUID> search(@Param("categoryId") UUID categoryId, @Param("q") String q, Pageable pageable);
}

interface MarketplaceQuoteRequestRepository extends JpaRepository<MarketplaceQuoteRequest, UUID> {
    List<MarketplaceQuoteRequest> findBySupplierIdOrderByCreatedAtDesc(UUID supplierId);

    Optional<MarketplaceQuoteRequest> findByIdAndSupplierId(UUID id, UUID supplierId);
}
