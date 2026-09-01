package com.fitnessuplink.catalog;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoleProfileFieldRepository extends JpaRepository<RoleProfileField, RoleProfileFieldId> {

    @EntityGraph(attributePaths = "field")
    List<RoleProfileField> findByRole_IdOrderBySortOrderAsc(UUID roleId);
}
