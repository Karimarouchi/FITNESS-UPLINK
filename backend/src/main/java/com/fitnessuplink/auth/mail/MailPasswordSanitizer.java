package com.fitnessuplink.auth.mail;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MailPasswordSanitizer {

    private final JavaMailSender mailSender;

    @PostConstruct
    void stripSpacesFromAppPassword() {
        if (mailSender instanceof JavaMailSenderImpl impl && impl.getPassword() != null) {
            impl.setPassword(impl.getPassword().replace(" ", ""));
        }
    }
}
