package com.fitnessuplink.marketplace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ProductDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.SupplierStatsDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.UpsertProductRequest;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final UploadService uploadService;
    private final ObjectMapper objectMapper;
    private final PermissionService permissionService;
    private final MarketplaceConversationRepository conversationRepository;
    private final MarketplaceMessageRepository messageRepository;

    @Transactional(readOnly = true)
    public List<ProductDto> list(User supplier) {
        requireSupplier(supplier);
        return withCategoryNames(productRepository.findBySupplierIdOrderByCreatedAtDesc(supplier.getId()));
    }

    @Transactional
    public ProductDto create(User supplier, UpsertProductRequest request) {
        requireSupplier(supplier);
        ProductCategory category = requireCategory(request.categoryId());
        Instant now = Instant.now();
        Product product = Product.builder()
                .id(UUID.randomUUID())
                .supplierId(supplier.getId())
                .categoryId(category.getId())
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        apply(product, request);
        return toDto(productRepository.save(product), category.getName());
    }

    @Transactional
    public ProductDto update(User supplier, UUID id, UpsertProductRequest request) {
        requireSupplier(supplier);
        Product product = requireOwned(supplier.getId(), id);
        ProductCategory category = requireCategory(request.categoryId());
        product.setCategoryId(category.getId());
        apply(product, request);
        product.setUpdatedAt(Instant.now());
        return toDto(productRepository.save(product), category.getName());
    }

    @Transactional
    public void delete(User supplier, UUID id) {
        requireSupplier(supplier);
        productRepository.delete(requireOwned(supplier.getId(), id));
    }

    @Transactional
    public UUID uploadPhoto(User supplier, MultipartFile file) {
        requireSupplier(supplier);
        return uploadService.storeHireFile(supplier.getId(), file).getId();
    }

    Product requireOwned(UUID supplierId, UUID id) {
        return productRepository.findByIdAndSupplierId(id, supplierId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));
    }

    private ProductCategory requireCategory(UUID categoryId) {
        if (categoryId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CATEGORY_REQUIRED");
        }
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "CATEGORY_NOT_FOUND"));
    }

    private void apply(Product product, UpsertProductRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isBlank() || name.length() > 160) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PRODUCT_NAME_INVALID");
        }
        product.setName(name);
        product.setBrand(blankToNull(request.brand()));
        product.setDescription(blankToNull(request.description()));
        product.setTechnicalSheet(blankToNull(request.technicalSheet()));
        if (request.priceAmount() != null && request.priceAmount().signum() < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PRICE_INVALID");
        }
        product.setPriceAmount(request.priceAmount());
        product.setPriceCurrency(request.priceAmount() == null ? null : normalizeCurrency(request.priceCurrency()));
        product.setPhotosJson(writeUploadIds(request.photoUploadIds()));
        product.setVideosJson(writeStrings(request.videos()));
        if (request.active() != null) {
            product.setActive(request.active());
        }
        product.setItemCondition(ItemCondition.normalize(request.condition()));
    }

    @Transactional(readOnly = true)
    public SupplierStatsDto stats(User supplier) {
        requireSupplier(supplier);
        List<Product> products = productRepository.findBySupplierIdOrderByCreatedAtDesc(supplier.getId());
        long published = products.stream().filter(Product::isPubliclyVisible).count();
        long hidden = products.stream().filter(Product::isHiddenByAdmin).count();
        long drafts = products.stream().filter(p -> !p.isActive() && !p.isHiddenByAdmin()).count();
        long views = products.stream().mapToLong(Product::getViewCount).sum();
        long conversations = conversationRepository.countBySupplierId(supplier.getId());
        long unread = messageRepository.unreadPerConversation(supplier.getId()).size();
        return new SupplierStatsDto(products.size(), published, drafts, hidden, views, conversations, unread);
    }

    private String normalizeCurrency(String currency) {
        String value = currency == null ? "" : currency.trim().toUpperCase();
        if (value.length() != 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CURRENCY_INVALID");
        }
        return value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void requireSupplier(User user) {
        permissionService.require(user, Permissions.MARKETPLACE_MANAGE);
    }

    List<ProductDto> withCategoryNames(List<Product> products) {
        Map<UUID, String> names = categoryRepository.findAllById(products.stream().map(Product::getCategoryId).distinct().toList())
                .stream().collect(Collectors.toMap(ProductCategory::getId, ProductCategory::getName));
        return products.stream()
                .map(p -> toDto(p, names.getOrDefault(p.getCategoryId(), "—")))
                .toList();
    }

    ProductDto toDto(Product product, String categoryName) {
        return new ProductDto(
                product.getId(),
                product.getCategoryId(),
                categoryName,
                product.getName(),
                product.getBrand(),
                product.getDescription(),
                product.getTechnicalSheet(),
                product.getPriceAmount(),
                product.getPriceCurrency(),
                readUploadIds(product.getPhotosJson()),
                readStrings(product.getVideosJson()),
                product.isActive(),
                product.getItemCondition(),
                product.getViewCount(),
                product.isHiddenByAdmin(),
                product.getHiddenReason(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }

    private String writeUploadIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return null;
        }
        try {
            List<Map<String, String>> refs = new ArrayList<>();
            for (UUID id : ids) {
                refs.add(Map.of("id", id.toString()));
            }
            return objectMapper.writeValueAsString(refs);
        } catch (Exception ex) {
            return null;
        }
    }

    List<UUID> readUploadIds(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            JsonNode array = objectMapper.readTree(json);
            List<UUID> ids = new ArrayList<>();
            for (JsonNode item : array) {
                JsonNode idNode = item.get("id");
                if (idNode != null && idNode.isTextual()) {
                    ids.add(UUID.fromString(idNode.asText()));
                }
            }
            return ids;
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String writeStrings(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(values);
        } catch (Exception ex) {
            return null;
        }
    }

    private List<String> readStrings(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            JsonNode array = objectMapper.readTree(json);
            List<String> items = new ArrayList<>();
            for (JsonNode item : array) {
                if (item.isTextual() && !item.asText().isBlank()) {
                    items.add(item.asText());
                }
            }
            return items;
        } catch (Exception ex) {
            return List.of();
        }
    }
}
