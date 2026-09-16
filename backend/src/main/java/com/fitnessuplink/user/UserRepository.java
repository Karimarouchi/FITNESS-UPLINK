package com.fitnessuplink.user;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @EntityGraph(attributePaths = {"appRole", "country"})
    Optional<User> findByEmail(String email);

    @Override
    @EntityGraph(attributePaths = {"appRole", "country"})
    Optional<User> findById(UUID id);

    @Override
    @EntityGraph(attributePaths = {"appRole", "country"})
    List<User> findAll();

    @EntityGraph(attributePaths = {"appRole", "country"})
    List<User> findByAppRole_CodeAndOnboardingCompletedTrueAndProfileVisibleTrue(String code);

    @EntityGraph(attributePaths = {"appRole", "country"})
    List<User> findByIdIn(java.util.Collection<UUID> ids);

    @EntityGraph(attributePaths = {"appRole", "country"})
    List<User> findByAppRole_Code(String code);

    boolean existsByEmail(String email);
}
