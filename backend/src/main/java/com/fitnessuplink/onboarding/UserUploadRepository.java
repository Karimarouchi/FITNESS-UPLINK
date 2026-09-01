package com.fitnessuplink.onboarding;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserUploadRepository extends JpaRepository<UserUpload, UUID> {

    Optional<UserUpload> findByIdAndUserId(UUID id, UUID userId);
}
