package com.fitnessuplink.catalog;

import com.fitnessuplink.catalog.dto.CountryResponse;
import com.fitnessuplink.catalog.dto.RoleCardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final AppRoleRepository appRoleRepository;
    private final CountryRepository countryRepository;

    @Transactional(readOnly = true)
    public List<RoleCardResponse> selectableRoles() {
        return appRoleRepository.findBySelectableTrueOrderBySortOrderAsc().stream()
                .map(role -> new RoleCardResponse(
                        role.getId(),
                        role.getCode(),
                        role.getLabel(),
                        role.getDescription(),
                        role.getCategory(),
                        role.getCategoryLabel(),
                        role.getIcon(),
                        role.getSortOrder()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CountryResponse> countries(String query) {
        String q = query == null ? "" : query.trim();
        List<Country> countries = q.isEmpty()
                ? countryRepository.findAllByOrderBySortOrderAsc()
                : countryRepository.search(q);
        return countries.stream()
                .map(country -> new CountryResponse(
                        country.getId(),
                        country.getIso2(),
                        country.getName(),
                        country.getFlagEmoji(),
                        country.getCallingCode()
                ))
                .toList();
    }
}
