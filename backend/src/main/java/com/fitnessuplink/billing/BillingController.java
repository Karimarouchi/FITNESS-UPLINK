package com.fitnessuplink.billing;

import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.billing.dto.BillingDtos.CatalogDto;
import com.fitnessuplink.billing.dto.BillingDtos.CheckoutRequest;
import com.fitnessuplink.billing.dto.BillingDtos.InvoiceDto;
import com.fitnessuplink.billing.dto.BillingDtos.MeBillingDto;
import lombok.RequiredArgsConstructor;
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

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @GetMapping("/catalog")
    public CatalogDto catalog(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String family
    ) {
        if (principal == null) {
            return billingService.publicCatalog(family);
        }
        return billingService.catalog(principal.getUser());
    }

    @GetMapping("/me")
    public MeBillingDto me(@AuthenticationPrincipal UserPrincipal principal) {
        return billingService.me(principal.getUser());
    }

    @PostMapping("/checkout")
    public MeBillingDto checkout(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody CheckoutRequest request
    ) {
        return billingService.checkout(principal.getUser(), request);
    }

    @PostMapping("/cancel")
    public MeBillingDto cancel(@AuthenticationPrincipal UserPrincipal principal) {
        return billingService.cancel(principal.getUser());
    }

    @GetMapping("/invoices")
    public List<InvoiceDto> invoices(@AuthenticationPrincipal UserPrincipal principal) {
        return billingService.invoices(principal.getUser());
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<byte[]> invoice(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        BillingInvoice invoice = billingService.invoice(principal.getUser(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + invoice.getNumber() + ".html\"")
                .body(invoice.getHtml().getBytes(StandardCharsets.UTF_8));
    }
}
