package com.fitnessuplink.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmailCodeRepository extends JpaRepository<EmailCode, UUID> {

    Optional<EmailCode> findTopByEmailAndPurposeOrderByCreatedAtDesc(String email, EmailCodePurpose purpose);

    Optional<EmailCode> findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
            String email,
            EmailCodePurpose purpose
    );
}
