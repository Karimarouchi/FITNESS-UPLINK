package com.fitnessuplink.contracts;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.contracts.dto.ContractDto;
import com.fitnessuplink.contracts.dto.ContractHistoryDto;
import com.fitnessuplink.contracts.dto.CreateContractRequest;
import com.fitnessuplink.onboarding.UploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;

    @PostMapping
    public ContractDto create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateContractRequest request
    ) {
        return contractService.create(principal.getUser(), request);
    }

    @GetMapping
    public List<ContractDto> list(@AuthenticationPrincipal UserPrincipal principal) {
        return contractService.list(principal.getUser());
    }

    @GetMapping("/{id}")
    public ContractDto get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return contractService.get(principal.getUser(), id);
    }

    @PostMapping(path = "/{id}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ContractDto upload(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam MultipartFile file
    ) {
        return contractService.upload(principal.getUser(), id, file);
    }

    @PostMapping("/{id}/send")
    public ContractDto send(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return contractService.send(principal.getUser(), id);
    }

    @PostMapping("/{id}/sign")
    public ContractDto sign(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return contractService.sign(principal.getUser(), id);
    }

    @PostMapping("/{id}/cancel")
    public ContractDto cancel(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return contractService.cancel(principal.getUser(), id);
    }

    @GetMapping("/{id}/history")
    public List<ContractHistoryDto> history(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return contractService.history(principal.getUser(), id);
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<Resource> document(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return file(contractService.document(principal.getUser(), id, false));
    }

    @GetMapping("/{id}/signed-document")
    public ResponseEntity<Resource> signedDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return file(contractService.document(principal.getUser(), id, true));
    }

    private ResponseEntity<Resource> file(UploadService.LoadedUpload loaded) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.upload().getContentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline()
                                .filename(loaded.upload().getOriginalFilename(), StandardCharsets.UTF_8)
                                .build()
                                .toString()
                )
                .body(loaded.resource());
    }
}
