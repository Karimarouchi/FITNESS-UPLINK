package com.fitnessuplink.auth.mail;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

class MailAddressMaskerTest {

    @Test
    void masksLocalPartAndKeepsDomain() {
        assertEquals("k***@gmail.com", MailAddressMasker.mask("karim@gmail.com"));
    }

    @Test
    void leavesBlankErrorsEmpty() {
        assertNull(MailAddressMasker.sanitizeError(null));
        assertNull(MailAddressMasker.sanitizeError("  "));
    }

    @Test
    void stripsSecretsFromErrorMessages() {
        String cleaned = MailAddressMasker.sanitizeError("SMTP failed password=supersecret host=smtp.gmail.com");
        assertFalse(cleaned.contains("supersecret"));
        assertEquals("SMTP failed password=*** host=smtp.gmail.com", cleaned);
    }
}
