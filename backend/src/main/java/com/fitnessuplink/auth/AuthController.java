package com.fitnessuplink.auth;

import com.fitnessuplink.auth.config.SecurityProperties;
import com.fitnessuplink.auth.dto.AuthResponse;
import com.fitnessuplink.auth.dto.ForgotPasswordRequest;
import com.fitnessuplink.auth.dto.LoginRequest;
import com.fitnessuplink.auth.dto.ResetPasswordRequest;
import com.fitnessuplink.auth.dto.SignupRequest;
import com.fitnessuplink.auth.dto.VerifyEmailRequest;
import com.fitnessuplink.auth.dto.ChangeEmailRequest;
import com.fitnessuplink.auth.dto.SignupCodeRequests.PendingSignupResponse;
import com.fitnessuplink.auth.dto.SignupCodeRequests.ResendSignupRequest;
import com.fitnessuplink.auth.dto.SignupCodeRequests.VerifySignupRequest;
import com.fitnessuplink.auth.dto.VerifyResetCodeRequest;
import com.fitnessuplink.auth.security.UserPrincipal;
import com.fitnessuplink.user.UserService;
import com.fitnessuplink.user.dto.UserResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;
    private final SecurityProperties securityProperties;
    private final UserService userService;

    @PostMapping("/signup")
    public ResponseEntity<PendingSignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(authService.signup(request));
    }

    @PostMapping("/signup/resend")
    public ResponseEntity<PendingSignupResponse> resendSignupCode(@Valid @RequestBody ResendSignupRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(authService.resendSignupCode(request));
    }

    @PostMapping("/signup/verify")
    public ResponseEntity<AuthResponse> verifySignup(@Valid @RequestBody VerifySignupRequest request) {
        AuthService.IssuedAuth issued = authService.verifySignup(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header("Set-Cookie", authCookieService.createRefreshCookie(issued.rawRefreshToken(), issued.refreshTtl()).toString())
                .body(issued.response());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.IssuedAuth issued = authService.login(request);
        return authCookieService.withRefreshCookie(
                issued.response(),
                authCookieService.createRefreshCookie(issued.rawRefreshToken(), issued.refreshTtl())
        );
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request) {
        AuthService.IssuedAuth issued = authService.refresh(readRefreshCookie(request));
        return authCookieService.withRefreshCookie(
                issued.response(),
                authCookieService.createRefreshCookie(issued.rawRefreshToken(), issued.refreshTtl())
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authService.logout(readRefreshCookie(request));
        return ResponseEntity.noContent()
                .header("Set-Cookie", authCookieService.clearRefreshCookie().toString())
                .build();
    }

    @PostMapping("/verify-email")
    public UserResponse verifyEmail(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody VerifyEmailRequest request
    ) {
        return authService.verifyEmail(principal.getId(), request.code());
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@AuthenticationPrincipal UserPrincipal principal) {
        authService.resendVerification(principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-email")
    public UserResponse changeEmail(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangeEmailRequest request
    ) {
        return authService.changeUnverifiedEmail(principal.getId(), request);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/verify-reset-code")
    public ResponseEntity<Void> verifyResetCode(@Valid @RequestBody VerifyResetCodeRequest request) {
        authService.verifyResetCode(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return userService.toResponse(principal.getUser());
    }

    private String readRefreshCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        String name = securityProperties.refreshToken().cookieName();
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
