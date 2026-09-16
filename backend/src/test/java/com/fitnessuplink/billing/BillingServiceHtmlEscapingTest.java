package com.fitnessuplink.billing;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Regression test for the stored-HTML-injection fix in BillingService#invoiceHtml:
 * user-controlled fields (display name, email) are interpolated into an HTML invoice
 * served with Content-Type text/html, so they must be HTML-escaped before injection.
 */
class BillingServiceHtmlEscapingTest {

    @Test
    void escapesHtmlSpecialCharacters() {
        String malicious = "<script>alert('xss')</script>";
        String escaped = BillingService.escapeHtml(malicious);

        assertFalse(escaped.contains("<script>"), "raw <script> tag must not survive escaping");
        assertEquals("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;", escaped);
    }

    @Test
    void escapesAttributeBreakoutCharacters() {
        String payload = "\" onmouseover=\"alert(1)";
        String escaped = BillingService.escapeHtml(payload);

        assertTrue(escaped.contains("&quot;"));
        assertFalse(escaped.contains("\""));
    }

    @Test
    void leavesPlainTextUnchanged() {
        assertEquals("Fitness Uplink Employer", BillingService.escapeHtml("Fitness Uplink Employer"));
    }

    @Test
    void handlesNullSafely() {
        assertEquals("", BillingService.escapeHtml(null));
    }
}
