package com.fitnessuplink.auth.mail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MailEventRepository extends JpaRepository<MailEvent, UUID> {

    Page<MailEvent> findByStatusOrderByCreatedAtDesc(MailEventStatus status, Pageable pageable);

    Page<MailEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
