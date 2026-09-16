package com.fitnessuplink.coaching;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.access.Permissions;
import com.fitnessuplink.coaching.dto.CoachingDtos.AdminCoachSummaryDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.BookingDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.CoachingReportDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.PlatformSettingsDto;
import com.fitnessuplink.coaching.dto.CoachingDtos.ResolveReportRequest;
import com.fitnessuplink.coaching.dto.CoachingDtos.UpdatePlatformSettingsRequest;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminCoachingService {

    private final UserRepository userRepository;
    private final CoachServiceRepository coachServiceRepository;
    private final CoachingBookingRepository bookingRepository;
    private final CoachingReviewRepository reviewRepository;
    private final CoachingReportRepository reportRepository;
    private final CoachingPlatformSettingsRepository platformSettingsRepository;
    private final CoachingReportService coachingReportService;
    private final PermissionService permissionService;

    @Transactional(readOnly = true)
    public List<AdminCoachSummaryDto> coaches(User admin) {
        requireAdmin(admin);
        return userRepository.findByAppRole_Code("CANDIDATE").stream()
                .filter(u -> "COACHING".equals(u.getProfessionalIntent()) || "BOTH".equals(u.getProfessionalIntent()))
                .map(coach -> {
                    List<CoachingReview> reviews = reviewRepository.findByCoachIdOrderByCreatedAtDesc(coach.getId());
                    double avg = reviews.isEmpty() ? 0.0 : reviews.stream().mapToInt(CoachingReview::getRating).average().orElse(0.0);
                    return new AdminCoachSummaryDto(
                            coach.getId(),
                            coach.getDisplayName(),
                            coach.getEmail(),
                            null,
                            coach.isProfileVisible(),
                            coachServiceRepository.findByCoachIdOrderByCreatedAtDesc(coach.getId()).size(),
                            bookingRepository.findByCoachIdOrderByScheduledAtDesc(coach.getId()).size(),
                            avg
                    );
                })
                .sorted(Comparator.comparing(AdminCoachSummaryDto::displayName))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingDto> bookings(User admin) {
        requireAdmin(admin);
        List<CoachingBooking> bookings = bookingRepository.findAll().stream()
                .sorted(Comparator.comparing(CoachingBooking::getScheduledAt).reversed())
                .toList();
        List<UUID> userIds = bookings.stream()
                .flatMap(b -> java.util.stream.Stream.of(b.getCoachId(), b.getClientId()))
                .distinct()
                .toList();
        Map<UUID, User> users = userRepository.findByIdIn(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<UUID, String> serviceNames = coachServiceRepository.findAllById(
                bookings.stream().map(CoachingBooking::getCoachServiceId).distinct().toList()
        ).stream().collect(Collectors.toMap(CoachService::getId, CoachService::getName));
        return bookings.stream()
                .map(b -> new BookingDto(
                        b.getId(),
                        b.getCoachId(),
                        users.containsKey(b.getCoachId()) ? users.get(b.getCoachId()).getDisplayName() : null,
                        b.getClientId(),
                        users.containsKey(b.getClientId()) ? users.get(b.getClientId()).getDisplayName() : null,
                        b.getCoachServiceId(),
                        serviceNames.getOrDefault(b.getCoachServiceId(), "Séance"),
                        b.getScheduledAt(),
                        b.getDurationMinutes(),
                        b.getStatus().name(),
                        b.getPriceAmount(),
                        b.getPriceCurrency(),
                        b.getPackId(),
                        false,
                        b.getCreatedAt(),
                        List.of()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CoachingReportDto> reports(User admin) {
        requireAdmin(admin);
        List<CoachingReport> reports = reportRepository.findAllByOrderByCreatedAtDesc();
        Map<UUID, User> reporters = userRepository.findByIdIn(reports.stream().map(CoachingReport::getReporterId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, u -> u));
        return reports.stream()
                .map(r -> coachingReportService.toDto(
                        r,
                        reporters.containsKey(r.getReporterId()) ? reporters.get(r.getReporterId()).getDisplayName() : "Utilisateur"
                ))
                .toList();
    }

    @Transactional
    public CoachingReportDto resolveReport(User admin, UUID reportId, ResolveReportRequest request) {
        requireAdmin(admin);
        CoachingReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REPORT_NOT_FOUND"));
        report.setStatus(CoachingReportStatus.RESOLVED);
        report.setAdminNote(request == null ? null : request.adminNote());
        report.setResolvedAt(Instant.now());
        reportRepository.save(report);
        User reporter = userRepository.findById(report.getReporterId()).orElse(null);
        return coachingReportService.toDto(report, reporter == null ? "Utilisateur" : reporter.getDisplayName());
    }

    @Transactional(readOnly = true)
    public PlatformSettingsDto platformSettings(User admin) {
        requireAdmin(admin);
        return new PlatformSettingsDto(currentRate());
    }

    @Transactional
    public PlatformSettingsDto updatePlatformSettings(User admin, UpdatePlatformSettingsRequest request) {
        requireAdmin(admin);
        BigDecimal rate = request == null || request.commissionRate() == null ? BigDecimal.ZERO : request.commissionRate();
        if (rate.signum() < 0 || rate.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "COMMISSION_RATE_INVALID");
        }
        CoachingPlatformSettings settings = platformSettingsRepository.findById((short) 1)
                .orElseGet(() -> CoachingPlatformSettings.builder().id((short) 1).build());
        settings.setCommissionRate(rate);
        settings.setUpdatedAt(Instant.now());
        platformSettingsRepository.save(settings);
        return new PlatformSettingsDto(rate);
    }

    private BigDecimal currentRate() {
        return platformSettingsRepository.findById((short) 1)
                .map(CoachingPlatformSettings::getCommissionRate)
                .orElse(BigDecimal.ZERO);
    }

    private void requireAdmin(User admin) {
        if (admin.isSuperAdmin()) {
            return;
        }
        permissionService.require(admin, Permissions.ADMIN_MODULES);
    }
}
