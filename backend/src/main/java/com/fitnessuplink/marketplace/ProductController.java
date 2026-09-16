package com.fitnessuplink.marketplace;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ProductDetailDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ProductDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.ProductPageDto;
import com.fitnessuplink.marketplace.dto.MarketplaceDtos.UpsertProductRequest;
import com.fitnessuplink.onboarding.UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/marketplace")
@RequiredArgsConstructor
public class ProductController {

    private final ProductCatalogService productCatalogService;
    private final ProductService productService;

    @GetMapping("/products")
    public ProductPageDto search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return productCatalogService.search(q, categoryId, page, size);
    }

    @GetMapping("/products/{id}")
    public ProductDetailDto detail(@PathVariable UUID id) {
        return productCatalogService.detail(id);
    }

    @GetMapping("/products/{id}/files/{uploadId}")
    public ResponseEntity<Resource> photo(@PathVariable UUID id, @PathVariable UUID uploadId) {
        UploadService.LoadedUpload loaded = productCatalogService.photo(id, uploadId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.upload().getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + loaded.upload().getOriginalFilename() + "\"")
                .body(loaded.resource());
    }

    @GetMapping("/mine")
    public List<ProductDto> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return productService.list(principal.getUser());
    }

    @PostMapping("/mine")
    public ProductDto create(@AuthenticationPrincipal UserPrincipal principal, @RequestBody UpsertProductRequest request) {
        return productService.create(principal.getUser(), request);
    }

    @PutMapping("/mine/{id}")
    public ProductDto update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpsertProductRequest request
    ) {
        return productService.update(principal.getUser(), id, request);
    }

    @DeleteMapping("/mine/{id}")
    public void delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        productService.delete(principal.getUser(), id);
    }

    @PostMapping("/mine/photos")
    public Map<String, UUID> uploadPhoto(@AuthenticationPrincipal UserPrincipal principal, @RequestParam("file") MultipartFile file) {
        return Map.of("uploadId", productService.uploadPhoto(principal.getUser(), file));
    }
}
