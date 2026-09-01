package com.fitnessuplink.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CountryRepository extends JpaRepository<Country, UUID> {

    List<Country> findAllByOrderBySortOrderAsc();

    @Query("""
            SELECT c FROM Country c
            WHERE :q IS NULL OR :q = ''
               OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(c.iso2) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY c.sortOrder ASC
            """)
    List<Country> search(@Param("q") String q);
}
