package com.fitnessuplink.auth.security;

import com.fitnessuplink.access.PermissionService;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        String email = username.trim().toLowerCase(Locale.ROOT);
        return userRepository.findByEmail(email)
                .map(user -> new UserPrincipal(user, permissionService.codesFor(user)))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(UUID userId) {
        return userRepository.findById(userId)
                .map(user -> new UserPrincipal(user, permissionService.codesFor(user)))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
