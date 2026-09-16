package com.fitnessuplink.auth.recaptcha;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.common.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RecaptchaServiceTest {

    private final RecaptchaService service = new RecaptchaService(
            new RecaptchaProperties("secret", 0.5),
            new ObjectMapper()
    );

    @Test
    void acceptValidSignupScore() throws Exception {
        assertDoesNotThrow(() -> service.accept(
                new ObjectMapper().readTree("{\"success\":true,\"score\":0.9,\"action\":\"signup\"}"),
                "signup"
        ));
    }

    @Test
    void rejectLowScore() throws Exception {
        ApiException ex = assertThrows(ApiException.class, () -> service.accept(
                new ObjectMapper().readTree("{\"success\":true,\"score\":0.1,\"action\":\"signup\"}"),
                "signup"
        ));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    void rejectWrongAction() throws Exception {
        assertThrows(ApiException.class, () -> service.accept(
                new ObjectMapper().readTree("{\"success\":true,\"score\":0.9,\"action\":\"login\"}"),
                "signup"
        ));
    }
}
