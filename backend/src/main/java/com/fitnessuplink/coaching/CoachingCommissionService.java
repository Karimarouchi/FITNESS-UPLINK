package com.fitnessuplink.coaching;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
class CoachingCommissionService {

    private final CoachingPlatformSettingsRepository platformSettingsRepository;

    @Transactional(readOnly = true)
    BigDecimal currentRate() {
        return platformSettingsRepository.findById((short) 1)
                .map(CoachingPlatformSettings::getCommissionRate)
                .orElse(BigDecimal.ZERO);
    }

    BigDecimal amountFor(BigDecimal price, BigDecimal rate) {
        if (price == null || rate == null || rate.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return price.multiply(rate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
