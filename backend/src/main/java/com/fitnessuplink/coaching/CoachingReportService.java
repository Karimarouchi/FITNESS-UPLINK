package com.fitnessuplink.coaching;

import com.fitnessuplink.coaching.dto.CoachingDtos.CoachingReportDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.ReportBookingRequest;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoachingReportService {

    private final CoachingBookingRepository bookingRepository;
    private final CoachingReportRepository reportRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public void report(User reporter, UUID bookingId, ReportBookingRequest request) {
        CoachingBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND"));
        if (!reporter.isSuperAdmin() && !booking.getCoachId().equals(reporter.getId()) && !booking.getClientId().equals(reporter.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        String reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (reason.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REASON_REQUIRED");
        }
        if (reportRepository.existsByBookingIdAndStatus(bookingId, CoachingReportStatus.OPEN)) {
            throw new ApiException(HttpStatus.CONFLICT, "REPORT_ALREADY_OPEN");
        }
        reportRepository.save(CoachingReport.builder()
                .id(UUID.randomUUID())
                .bookingId(bookingId)
                .reporterId(reporter.getId())
                .reason(reason)
                .status(CoachingReportStatus.OPEN)
                .createdAt(Instant.now())
                .build());
        userRepository.findByAppRole_Code("SUPER_ADMIN").forEach(admin -> notificationService.notify(
                admin.getId(),
                "Litige coaching",
                reporter.getDisplayName() + " a signalé une réservation.",
                "Ouvrir",
                "/admin/coaching"
        ));
    }

    CoachingReportDto toDto(CoachingReport report, String reporterName) {
        return new CoachingReportDto(
                report.getId(),
                report.getBookingId(),
                reporterName,
                report.getReason(),
                report.getStatus().name(),
                report.getAdminNote(),
                report.getCreatedAt(),
                report.getResolvedAt()
        );
    }
}
