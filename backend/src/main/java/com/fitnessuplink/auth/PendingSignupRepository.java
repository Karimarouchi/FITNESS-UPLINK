package com.fitnessuplink.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PendingSignupRepository extends JpaRepository<PendingSignup, UUID> {

    Optional<PendingSignup> findByEmail(String email);

    @Modifying
    @Query("delete from PendingSignup p where p.expiresAt < :now")
    int deleteExpired(@Param("now") Instant now);
}
