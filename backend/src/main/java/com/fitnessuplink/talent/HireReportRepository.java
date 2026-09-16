package com.fitnessuplink.talent;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface HireReportRepository extends JpaRepository<HireReport, UUID> {
}
