package com.fitnessuplink.auth.mail;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserMailPrefsRepository extends JpaRepository<UserMailPrefs, UUID> {
}
