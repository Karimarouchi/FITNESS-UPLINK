package com.fitnessuplink.marketplace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ProductCardDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ProductDetailDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ProductPageDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.SupplierSummaryDto;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductCatalogService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ProductService productService;
    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final UploadService uploadService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public ProductPageDto search(String q, UUID categoryId, String condition, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        String normalizedQ = q == null || q.isBlank() ? "" : q.trim();
        String normalizedCondition = ItemCondition.isValid(condition) ? condition : "";
        var result = productRepository.search(categoryId, normalizedCondition, normalizedQ, PageRequest.of(safePage, safeSize));
        Map<UUID, Product> products = productRepository.findAllById(result.getContent()).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        Map<UUID, String> categoryNames = categoryRepository.findAllById(
                products.values().stream().map(Product::getCategoryId).distinct().toList()
        ).stream().collect(Collectors.toMap(ProductCategory::getId, ProductCategory::getName));
        Map<UUID, User> suppliers = userRepository.findByIdIn(
                products.values().stream().map(Product::getSupplierId).distinct().toList()
        ).stream().collect(Collectors.toMap(User::getId, u -> u));

        List<ProductCardDto> items = result.getContent().stream()
                .map(products::get)
                .filter(p -> p != null)
                .map(p -> toCard(p, categoryNames.getOrDefault(p.getCategoryId(), "—"), suppliers.get(p.getSupplierId())))
                .toList();
        return new ProductPageDto(items, result.getTotalElements(), safePage, safeSize);
    }

    @Transactional
    public ProductDetailDto detail(UUID productId, User viewer) {
        Product product = requireVisible(productId);
        if (viewer == null || !viewer.getId().equals(product.getSupplierId())) {
            productRepository.incrementViews(productId);
        }
        User supplier = userRepository.findById(product.getSupplierId()).orElse(null);
        ProductCategory category = categoryRepository.findById(product.getCategoryId()).orElse(null);
        return new ProductDetailDto(
                productService.toDto(product, category == null ? "—" : category.getName()),
                supplierSummary(supplier)
        );
    }

    Product requireVisible(UUID productId) {
        return productRepository.findById(productId)
                .filter(Product::isPubliclyVisible)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));
    }

    @Transactional(readOnly = true)
    public UploadService.LoadedUpload photo(UUID productId, UUID uploadId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));
        if (!productService.readUploadIds(product.getPhotosJson()).contains(uploadId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PHOTO_NOT_FOUND");
        }
        return uploadService.loadAny(uploadId);
    }

    private ProductCardDto toCard(Product product, String categoryName, User supplier) {
        List<UUID> photos = productService.readUploadIds(product.getPhotosJson());
        return new ProductCardDto(
                product.getId(),
                product.getName(),
                product.getBrand(),
                categoryName,
                product.getPriceAmount(),
                product.getPriceCurrency(),
                photos.isEmpty() ? null : photos.get(0),
                supplierSummary(supplier),
                product.getItemCondition()
        );
    }

    SupplierSummaryDto supplierSummary(User supplier) {
        if (supplier == null) {
            return null;
        }
        Map<String, String> values = userProfileValueRepository.findByUserId(supplier.getId()).stream()
                .filter(v -> v.getValue() != null)
                .collect(Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (l, r) -> l));
        String name = text(values, "trade_name");
        if (name == null) {
            name = text(values, "legal_name");
        }
        if (name == null) {
            name = supplier.getDisplayName();
        }
        return new SupplierSummaryDto(
                supplier.getId(),
                name,
                firstUploadId(values.get("organization_logo")),
                text(values, "org_city")
        );
    }

    private String text(Map<String, String> values, String key) {
        String value = values.get(key);
        return value == null || value.isBlank() ? null : value;
    }

    private UUID firstUploadId(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            JsonNode first = node.isArray() ? (node.isEmpty() ? null : node.get(0)) : node;
            if (first == null) {
                return null;
            }
            JsonNode idNode = first.get("id");
            return idNode == null || !idNode.isTextual() ? null : UUID.fromString(idNode.asText());
        } catch (Exception ex) {
            return null;
        }
    }
}
