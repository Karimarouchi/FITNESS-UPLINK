package com.fitnessuplink.coaching;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "coach_availability_exceptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoachAvailabilityException {
    @Id
    private UUID id;
    @Column(name = "coach_id", nullable = false)
    private UUID coachId;
    @Column(name = "exception_date", nullable = false)
    private LocalDate exceptionDate;
    @Column(name = "start_time")
    private LocalTime startTime;
    @Column(name = "end_time")
    private LocalTime endTime;
    @Column(length = 200)
    private String note;
}
