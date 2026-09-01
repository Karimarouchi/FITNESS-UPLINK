package com.fitnessuplink.onboarding;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface UserProfileValueRepository extends JpaRepository<UserProfileValue, UserProfileValueId> {

    List<UserProfileValue> findByUserId(UUID userId);

    List<UserProfileValue> findByUserIdIn(Collection<UUID> userIds);

    void deleteByUserId(UUID userId);
}
