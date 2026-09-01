package com.fitnessuplink.auth;

import com.fitnessuplink.auth.config.SecurityProperties;
import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.catalog.AppRoleRepository;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Component
@RequiredArgsConstructor
public class SuperAdminSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final AppRoleRepository appRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityProperties securityProperties;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String email = securityProperties.superAdmin().email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            return;
        }
        AppRole superAdminRole = appRoleRepository.findByCode(UserService.SUPER_ADMIN_CODE)
                .orElseThrow(() -> new IllegalStateException("SUPER_ADMIN role is missing from the database"));
        SecurityProperties.SuperAdmin admin = securityProperties.superAdmin();
        userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(admin.password()))
                .appRole(superAdminRole)
                .onboardingCompleted(true)
                .verificationStatus("verified")
                .firstName(admin.firstName())
                .lastName(admin.lastName())
                .enabled(true)
                .build());
    }
}
