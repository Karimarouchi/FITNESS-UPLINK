package com.fitnessuplink.auth.mail;

public final class MailAddressMasker {

    private MailAddressMasker() {
    }

    public static String mask(String email) {
        if (email == null || email.isBlank()) {
            return "(none)";
        }
        String trimmed = email.trim();
        int at = trimmed.indexOf('@');
        if (at <= 0 || at == trimmed.length() - 1) {
            return "***";
        }
        String local = trimmed.substring(0, at);
        String domain = trimmed.substring(at + 1);
        char first = local.charAt(0);
        return first + "***@" + domain;
    }

    public static String sanitizeError(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }
        String cleaned = message.replaceAll("(?i)(password|passwd|pwd|secret)\\s*[=:]\\s*\\S+", "$1=***");
        if (cleaned.length() > 500) {
            return cleaned.substring(0, 500);
        }
        return cleaned;
    }
}
