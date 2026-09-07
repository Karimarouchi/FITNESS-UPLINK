package com.fitnessuplink.onboarding.cv;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class CvTextNormalizer {

    private static final Pattern SPACED_GLYPHS = Pattern.compile(
            "(?<![\\p{L}\\p{N}])([\\p{L}\\p{N}])(?: ([\\p{L}\\p{N}])){1,}(?![\\p{L}\\p{N}])"
    );

    private CvTextNormalizer() {
    }

    static String normalize(String text) {
        if (text == null) {
            return "";
        }
        String cleaned = text.replace('\u00a0', ' ')
                .replace('\u200b', ' ')
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("[\\t\\f]+", " ");
        StringBuilder out = new StringBuilder();
        for (String line : cleaned.split("\n", -1)) {
            if (!out.isEmpty()) {
                out.append('\n');
            }
            out.append(collapseSpacedGlyphs(line.replaceAll(" +", " ").trim()));
        }
        return out.toString().replaceAll("\n{3,}", "\n\n").trim();
    }

    static String collapseSpacedGlyphs(String line) {
        Matcher matcher = SPACED_GLYPHS.matcher(line);
        StringBuilder rebuilt = new StringBuilder();
        int last = 0;
        while (matcher.find()) {
            rebuilt.append(line, last, matcher.start());
            rebuilt.append(matcher.group().replace(" ", ""));
            last = matcher.end();
        }
        rebuilt.append(line.substring(last));
        return rebuilt.toString();
    }

    static int identityScore(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        int score = Math.min(text.length() / 80, 8);
        if (Pattern.compile("(?:\\+|00)\\s*216").matcher(text).find()
                || Pattern.compile("(?:\\+|00)\\s*33").matcher(text).find()) {
            score += 12;
        }
        if (text.contains("@")) {
            score += 6;
        }
        if (Pattern.compile("\\b[A-ZÀ-Ÿ]{2,}\\s+[A-ZÀ-Ÿ]{2,}\\b").matcher(text).find()) {
            score += 8;
        }
        return score;
    }
}
