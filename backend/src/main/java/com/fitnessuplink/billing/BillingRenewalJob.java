package com.fitnessuplink.billing;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BillingRenewalJob {

    private final BillingService billingService;

    @Scheduled(cron = "0 15 * * * *")
    public void run() {
        billingService.convertDueTrials();
    }
}
