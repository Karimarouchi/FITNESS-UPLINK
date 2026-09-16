package com.fitnessuplink.talent;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RecruitmentMessageRepository extends JpaRepository<RecruitmentMessage, UUID> {

    List<RecruitmentMessage> findByRecruitmentIdOrderByCreatedAtAsc(UUID recruitmentId);

    List<RecruitmentMessage> findByRecruitmentIdIn(Collection<UUID> recruitmentIds);
}
