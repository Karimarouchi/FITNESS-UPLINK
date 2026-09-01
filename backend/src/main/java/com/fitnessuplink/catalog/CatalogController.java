package com.fitnessuplink.catalog;

import com.fitnessuplink.catalog.dto.CountryResponse;
import com.fitnessuplink.catalog.dto.RoleCardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/catalog")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping("/roles")
    public List<RoleCardResponse> roles() {
        return catalogService.selectableRoles();
    }

    @GetMapping("/countries")
    public List<CountryResponse> countries(@RequestParam(required = false) String q) {
        return catalogService.countries(q);
    }
}
