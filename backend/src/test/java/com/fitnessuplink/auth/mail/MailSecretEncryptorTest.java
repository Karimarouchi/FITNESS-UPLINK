package com.fitnessuplink.auth.mail;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MailSecretEncryptorTest {

    @Test
    void roundTripsPassword() {
        MailSecretEncryptor encryptor = new MailSecretEncryptor(
                new MailProperties("Fitness Uplink", "from@example.com", Duration.ofMinutes(10), Duration.ofSeconds(60), 5, "unit-test-secret")
        );
        String stored = encryptor.encrypt("app-password");
        assertEquals("app-password", encryptor.decrypt(stored));
    }
}
