package com.fitnessuplink.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppRoleRepository extends JpaRepository<AppRole, UUID> {

    Optional<AppRole> findByCode(String code);

    List<AppRole> findAllByOrderBySortOrderAsc();

    List<AppRole> findBySelectableTrueOrderBySortOrderAsc();
}
