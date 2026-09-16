package com.fitnessuplink.billing;

import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(20)
@RequiredArgsConstructor
public class BillingGrantSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final BillingGrantRepository billingGrantRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        userRepository.findAll().stream()
                .filter(user -> user.getAppRole() != null && UserService.SUPER_ADMIN_CODE.equals(user.getAppRole().getCode()))
                .forEach(user -> {
                    BillingGrant.Id id = new BillingGrant.Id(user.getId(), Entitlements.UNLOCK_ALL);
                    if (!billingGrantRepository.existsById(id)) {
                        billingGrantRepository.save(new BillingGrant(id));
                    }
                });
    }
}
