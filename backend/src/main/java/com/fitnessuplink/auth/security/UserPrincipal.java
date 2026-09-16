package com.fitnessuplink.auth.security;

import com.fitnessuplink.user.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Getter
public class UserPrincipal implements UserDetails {

    private final User user;
    private final List<String> permissions;

    public UserPrincipal(User user) {
        this(user, List.of());
    }

    public UserPrincipal(User user, List<String> permissions) {
        this.user = user;
        this.permissions = permissions == null ? List.of() : List.copyOf(permissions);
    }

    public UUID getId() {
        return user.getId();
    }

    public boolean hasPermission(String code) {
        return user.isSuperAdmin() || permissions.contains(code);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.roleCode()));
        for (String permission : permissions) {
            authorities.add(new SimpleGrantedAuthority("PERM_" + permission));
        }
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonLocked() {
        return !user.isLocked(Instant.now());
    }

    @Override
    public boolean isEnabled() {
        return user.isEnabled();
    }
}
