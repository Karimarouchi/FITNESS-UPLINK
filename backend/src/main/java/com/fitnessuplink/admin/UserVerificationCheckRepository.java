package com.fitnessuplink.admin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserVerificationCheckRepository extends JpaRepository<UserVerificationCheck, UserVerificationCheckId> {

    List<UserVerificationCheck> findByUserId(UUID userId);
}
