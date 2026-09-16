package com.fitnessuplink.talent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "recruitment_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecruitmentMessage {

    @Id
    private UUID id;

    @Column(name = "recruitment_id", nullable = false)
    private UUID recruitmentId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "upload_id")
    private UUID uploadId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
