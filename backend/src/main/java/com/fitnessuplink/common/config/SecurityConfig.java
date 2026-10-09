package com.fitnessuplink.common.config;

import com.fitnessuplink.auth.config.SecurityProperties;
import com.fitnessuplink.auth.mail.MailProperties;
import com.fitnessuplink.auth.recaptcha.RecaptchaProperties;
import com.fitnessuplink.auth.security.AuthRateLimitFilter;
import com.fitnessuplink.auth.security.EmailVerifiedFilter;
import com.fitnessuplink.auth.security.JsonAuthHandlers;
import com.fitnessuplink.auth.security.JwtAuthenticationFilter;
import com.fitnessuplink.contracts.signature.SignatureProperties;
import com.fitnessuplink.onboarding.UploadProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties({
            SecurityProperties.class,
            UploadProperties.class,
            SignatureProperties.class,
            MailProperties.class,
            RecaptchaProperties.class
    })
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuthRateLimitFilter authRateLimitFilter;
    private final EmailVerifiedFilter emailVerifiedFilter;
    private final JsonAuthHandlers jsonAuthHandlers;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                        .referrerPolicy(policy -> policy.policy(
                                ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
                        ))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                HttpMethod.POST,
                                "/v1/auth/login",
                                "/v1/auth/signup",
                                "/v1/auth/signup/verify",
                                "/v1/auth/signup/resend",
                                "/v1/auth/refresh",
                                "/v1/auth/logout",
                                "/v1/auth/forgot-password",
                                "/v1/auth/verify-reset-code",
                                "/v1/auth/reset-password"
                        ).permitAll()
                        .requestMatchers("/v1/health", "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/billing/catalog").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/webhooks/signature").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/marketplace/categories", "/v1/marketplace/products", "/v1/marketplace/products/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/coaches/top-rated", "/v1/coaches/top-rated/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/academy/formations", "/v1/academy/formations/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/opportunities/preview").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/marketplace/products/*/quote-requests").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/marketplace/quote-requests/*/confirm", "/v1/marketplace/quote-requests/*/resend").permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(jsonAuthHandlers)
                        .accessDeniedHandler(jsonAuthHandlers)
                )
                .addFilterBefore(authRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(emailVerifiedFilter, JwtAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
