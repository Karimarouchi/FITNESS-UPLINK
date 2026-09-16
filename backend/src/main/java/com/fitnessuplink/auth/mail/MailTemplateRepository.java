package com.fitnessuplink.auth.mail;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MailTemplateRepository extends JpaRepository<MailTemplate, MailPurpose> {
}
