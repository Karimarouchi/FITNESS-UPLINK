package com.fitnessuplink.onboarding.cv;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class CvProfileParser {

    private static final Pattern EMAIL = Pattern.compile("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", Pattern.CASE_INSENSITIVE);
    private static final Pattern PHONE = Pattern.compile(
            "(?:\\+|00)\\s*(?:216|33)\\s*[\\d\\s./()-]{6,18}|(?<!\\d)(?:2|4|5|9)\\d(?:[\\s./-]*\\d){6,7}(?!\\d)"
    );
    private static final Pattern PERSON_NAME = Pattern.compile("^\\p{L}[\\p{L} .'\\-]{1,79}$");
    private static final Pattern ALL_CAPS_NAME = Pattern.compile(
            "\\b([A-ZÀ-Ÿ]{2,})\\s+([A-ZÀ-Ÿ]{2,}(?:\\s+[A-ZÀ-Ÿ]{2,})?)\\b"
    );
    private static final Pattern TITLE_CASE_NAME = Pattern.compile(
            "\\b([\\p{Lu}][\\p{Ll}]{1,30})\\s+([\\p{Lu}][\\p{Ll}]{1,30}(?:\\s+[\\p{Lu}][\\p{Ll}]{1,30})?)\\b"
    );
    private static final Pattern JOB_SUFFIX = Pattern.compile(
            "(?i)(CEO|CTO|CFO|COO|CMO|FOUNDER|CO-?FOUNDER|DIRECTOR|MANAGER|CONSULTANT|COACH|ENGINEER|DEVELOPER|DESIGNER|STRATEGIST).*$"
    );
    private static final Set<String> NAME_STOP = Set.of(
            "COMPETENCES", "COMPETENCE", "EXPERIENCES", "EXPERIENCE", "FORMATION", "FORMATIONS",
            "CONTACT", "PROFIL", "RESUME", "SUMMARY", "LANGUES", "LANGUAGES", "REALISATIONS",
            "RESEAUX", "MASTER", "LICENCE", "BACCALAUREAT", "EDUCATION", "SKILLS", "ABOUT",
            "TUNIS", "PARIS", "FRANCE", "TUNISIE", "LINKEDIN", "INSTAGRAM", "WEBSITE",
            "BRAND", "DIGITAL", "MARKETING", "CREATIVE", "AGENCY", "AGENCE"
    );
    private static final Pattern LABELED = Pattern.compile(
            "(?i)^(pr[eé]nom|nom|ville|city|adresse|address|titre|poste|profil|t[eé]l(?:[eé]phone)?|phone)\\s*[:\\-]\\s*(.+)$"
    );
    private static final Pattern YEAR_RANGE = Pattern.compile(
            "(?i)((?:janv|f[eé]vr|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[eé]c)[a-z]*\\.?)?\\s*"
                    + "((?:19|20)\\d{2})"
                    + "\\s*[-–—/à]+\\s*"
                    + "((?:janv|f[eé]vr|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[eé]c)[a-z]*\\.?)?\\s*"
                    + "((?:19|20)\\d{2}|pr[eé]sent|aujourd.?hui|en cours|actuel(?:le)?)"
    );
    private static final Pattern SALARY = Pattern.compile(
            "(?i)(\\d{3,5}(?:[.,]\\d{1,2})?)\\s*(tnd|dt|eur|€|usd|\\$|gbp|mad)"
    );
    private static final Pattern URL = Pattern.compile("(?i)https?://\\S+|www\\.\\S+|linkedin\\.com/\\S+");

    private static final Set<String> HEADINGS = Set.of(
            "experience", "expérience", "experiences", "expériences", "expérience professionnelle",
            "parcours", "parcours professionnel", "emploi", "emplois",
            "formation", "formations", "education", "éducation", "diplomes", "diplômes", "études",
            "competences", "compétences", "skills", "specialites", "spécialités",
            "langues", "languages", "langue",
            "certifications", "certification",
            "centres d'interet", "centres d'intérêt", "loisirs",
            "references", "références",             "contact", "profil", "a propos", "à propos",
            "objectif", "resume", "résumé", "summary", "biographie",
            "experiences professionnelles",
            "realisations cles", "réalisations clés", "realisations"
    );

    private static final List<String> SPECIALTIES = List.of(
            "musculation", "hiit", "yoga", "pilates", "rehab", "nutrition", "crossfit"
    );
    private static final Map<String, String> SPECIALTY_ALIASES = Map.ofEntries(
            Map.entry("musculation", "musculation"),
            Map.entry("force", "musculation"),
            Map.entry("muscu", "musculation"),
            Map.entry("hiit", "hiit"),
            Map.entry("cardio", "hiit"),
            Map.entry("yoga", "yoga"),
            Map.entry("pilates", "pilates"),
            Map.entry("rehab", "rehab"),
            Map.entry("réathlétisation", "rehab"),
            Map.entry("reathletisation", "rehab"),
            Map.entry("kiné", "rehab"),
            Map.entry("kine", "rehab"),
            Map.entry("nutrition", "nutrition"),
            Map.entry("crossfit", "crossfit"),
            Map.entry("cross fit", "crossfit")
    );
    private static final Map<String, String> MONTHS = Map.ofEntries(
            Map.entry("janv", "01"), Map.entry("jan", "01"),
            Map.entry("fevr", "02"), Map.entry("févr", "02"), Map.entry("feb", "02"),
            Map.entry("mars", "03"), Map.entry("mar", "03"),
            Map.entry("avr", "04"), Map.entry("apr", "04"),
            Map.entry("mai", "05"), Map.entry("may", "05"),
            Map.entry("juin", "06"), Map.entry("jun", "06"),
            Map.entry("juil", "07"), Map.entry("jul", "07"),
            Map.entry("aout", "08"), Map.entry("août", "08"), Map.entry("aug", "08"),
            Map.entry("sept", "09"), Map.entry("sep", "09"),
            Map.entry("oct", "10"),
            Map.entry("nov", "11"),
            Map.entry("dec", "12"), Map.entry("déc", "12")
    );
    private static final Map<String, String> CONTRACTS = Map.ofEntries(
            Map.entry("cdi", "cdi"),
            Map.entry("cdd", "cdd"),
            Map.entry("freelance", "freelance"),
            Map.entry("independant", "freelance"),
            Map.entry("indépendant", "freelance"),
            Map.entry("temps partiel", "part_time"),
            Map.entry("partiel", "part_time"),
            Map.entry("stage", "internship"),
            Map.entry("internship", "internship"),
            Map.entry("vacation", "vacation"),
            Map.entry("vacataire", "vacation")
    );
    private static final Map<String, String> LANGUAGE_LEVELS = Map.ofEntries(
            Map.entry("a1", "a1"), Map.entry("a2", "a2"),
            Map.entry("b1", "b1"), Map.entry("b2", "b2"),
            Map.entry("c1", "c1"), Map.entry("c2", "c2"),
            Map.entry("natif", "native"), Map.entry("native", "native"),
            Map.entry("maternelle", "native"), Map.entry("langue maternelle", "native"),
            Map.entry("courant", "c1"), Map.entry("bilingue", "c2"),
            Map.entry("intermédiaire", "b1"), Map.entry("intermediaire", "b1"),
            Map.entry("scolaire", "a2"), Map.entry("notions", "a2")
    );

    public ExtractedCv parse(String raw) {
        return parse(raw, null);
    }

    public ExtractedCv parse(String raw, String filename) {
        String text = CvTextExtractor.normalize(raw);
        if (text.length() < 40 && (filename == null || filename.isBlank())) {
            return ExtractedCv.empty();
        }
        List<String> lines = linesOf(text);
        Map<String, String> labeled = labeledValues(lines);

        String firstName = cleanName(firstNonBlank(labeled.get("prénom"), labeled.get("prenom")));
        String lastName = cleanName(labeled.get("nom"));
        if (firstName == null || lastName == null) {
            String[] fromHeader = nameFromDocument(text, lines, filename);
            if (firstName == null) {
                firstName = fromHeader[0];
            }
            if (lastName == null) {
                lastName = fromHeader[1];
            }
        }
        lastName = stripTrailingJobTitle(lastName);
        firstName = stripTrailingJobTitle(firstName);

        String phone = normalizePhone(firstNonBlank(
                labeled.get("téléphone"),
                labeled.get("telephone"),
                labeled.get("tel"),
                labeled.get("phone"),
                findPhone(text)
        ));
        String city = cleanCity(firstNonBlank(
                labeled.get("ville"),
                labeled.get("city"),
                cityFromAddress(labeled.get("adresse"), labeled.get("address")),
                cityFromText(lines),
                cityFromText(List.of(text))
        ));
        String title = clip(firstNonBlank(
                labeled.get("titre"),
                labeled.get("poste"),
                titleFromKeywords(text),
                titleFromHeader(lines)
        ), 120);
        if ("profil".equalsIgnoreCase(title)) {
            title = titleFromKeywords(text);
        }
        String biography = clip(firstNonBlank(
                section(lines, Set.of("profil", "à propos", "a propos", "objectif", "résumé", "resume", "summary", "biographie")),
                biographyFallback(lines)
        ), 800);
        String[] salary = salaryOf(text);

        return new ExtractedCv(
                firstName,
                lastName,
                phone,
                city,
                title,
                biography,
                specialtiesOf(text),
                skillsOf(lines),
                experiencesOf(lines),
                languagesOf(lines),
                salary[0],
                salary[1],
                contractsOf(text),
                availabilityOf(text)
        );
    }

    private static List<String> linesOf(String text) {
        List<String> lines = new ArrayList<>();
        for (String raw : text.split("\n")) {
            String line = raw.trim();
            if (!line.isBlank()) {
                lines.add(line);
            }
        }
        return lines;
    }

    private static Map<String, String> labeledValues(List<String> lines) {
        Map<String, String> values = new LinkedHashMap<>();
        for (String line : lines) {
            Matcher matcher = LABELED.matcher(line);
            if (matcher.matches()) {
                values.put(fold(matcher.group(1)), matcher.group(2).trim());
            }
        }
        return values;
    }

    private static String[] nameFromDocument(String text, List<String> lines, String filename) {
        String[] fromFile = nameFromFilename(filename);
        if (fromFile[0] != null && fromFile[1] != null) {
            return fromFile;
        }
        String[] fromLines = nameFromHeader(lines);
        if (fromLines[0] != null && fromLines[1] != null) {
            return fromLines;
        }
        String[] caps = nameFromPattern(text, ALL_CAPS_NAME);
        if (caps[0] != null) {
            return caps;
        }
        return nameFromPattern(text, TITLE_CASE_NAME);
    }

    private static String[] nameFromHeader(List<String> lines) {
        int limit = Math.min(20, lines.size());
        for (int i = 0; i < limit; i++) {
            String line = stripJobSuffix(lines.get(i));
            if (EMAIL.matcher(line).find() || findPhone(line) != null || URL.matcher(line).find() || isHeading(line)) {
                continue;
            }
            String cleaned = line.replaceAll("[|•·,]", " ").replaceAll("\\s+", " ").trim();
            String[] parts = cleaned.split(" ");
            if (parts.length >= 2 && parts.length <= 4 && PERSON_NAME.matcher(cleaned).matches() && looksLikePersonName(parts)) {
                return new String[]{titleCase(parts[0]), titleCase(String.join(" ", List.of(parts).subList(1, parts.length)))};
            }
            String glued = cleaned.replaceAll("(?i)(CEO|FOUNDER|COFOUNDER|DIRECTOR|MANAGER)$", "").trim();
            if (!glued.equals(cleaned)) {
                String[] gluedParts = glued.split("\\s+");
                if (gluedParts.length >= 2 && looksLikePersonName(gluedParts)) {
                    return new String[]{titleCase(gluedParts[0]), titleCase(String.join(" ", List.of(gluedParts).subList(1, gluedParts.length)))};
                }
            }
        }
        return new String[]{null, null};
    }

    private static String[] nameFromPattern(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            String first = matcher.group(1);
            String last = matcher.group(2);
            if (isNameStop(first) || isNameStop(last) || last.split(" ").length > 3) {
                continue;
            }
            if (first.length() < 2 || last.length() < 2) {
                continue;
            }
            return new String[]{titleCase(first), titleCase(last)};
        }
        return new String[]{null, null};
    }

    private static String[] nameFromFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return new String[]{null, null};
        }
        String base = filename.replaceAll("(?i)\\.(pdf|docx|doc)$", "");
        base = base.replaceAll("(?i)^(?:cv|resume|curriculum vitae)[-_ ]*", "");
        base = base.replace('_', ' ').replace('-', ' ').replaceAll("\\s+", " ").trim();
        String[] parts = base.split(" ");
        if (parts.length >= 2 && parts.length <= 4 && looksLikePersonName(parts)) {
            return new String[]{titleCase(parts[0]), titleCase(String.join(" ", List.of(parts).subList(1, parts.length)))};
        }
        return new String[]{null, null};
    }

    private static boolean looksLikePersonName(String[] parts) {
        for (String part : parts) {
            if (part.length() < 2 || isNameStop(part) || !part.chars().allMatch(ch -> Character.isLetter(ch) || ch == '\'' || ch == '-')) {
                return false;
            }
        }
        return true;
    }

    private static boolean isNameStop(String value) {
        return NAME_STOP.contains(fold(value).replace(" ", "").toUpperCase(Locale.ROOT))
                || NAME_STOP.contains(fold(value).toUpperCase(Locale.ROOT));
    }

    private static String stripTrailingJobTitle(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.replaceAll("(?i)(ceo|cto|cfo|coo|cmo|founder|cofounder)$", "").trim();
        return cleaned.isBlank() ? value : titleCase(cleaned);
    }

    private static String stripJobSuffix(String line) {
        String cut = JOB_SUFFIX.matcher(line).replaceFirst("").replaceAll("[&|,].*$", "").trim();
        return cut.isBlank() ? line : cut;
    }

    private static String titleFromKeywords(String text) {
        Matcher matcher = Pattern.compile(
                "(?i)\\b(CEO(?:\\s*&\\s*Co-?Founder)?|Co-?Founder|Coach sportif|Préparateur physique|Directeur[^\\n,]{0,40}|Manager[^\\n,]{0,30}|Consultant[^\\n,]{0,40})\\b"
        ).matcher(text);
        if (matcher.find()) {
            return clip(matcher.group().replaceAll("\\s+", " ").trim(), 120);
        }
        return null;
    }

    private static String biographyFallback(List<String> lines) {
        for (String line : lines) {
            if (line.length() > 120 && line.contains(" ")) {
                return line;
            }
        }
        return null;
    }

    private static String titleFromHeader(List<String> lines) {
        int seenName = 0;
        for (String line : lines.subList(0, Math.min(12, lines.size()))) {
            if (EMAIL.matcher(line).find() || findPhone(line) != null || URL.matcher(line).find() || isHeading(line)) {
                continue;
            }
            if (PERSON_NAME.matcher(line).matches() && line.split(" ").length <= 4 && seenName == 0) {
                seenName++;
                continue;
            }
            if (line.length() >= 3 && line.length() <= 80 && !line.contains("@")) {
                String cleaned = stripJobSuffix(line).replaceAll("\\s*[|•·].*", "").trim();
                if (cleaned.length() >= 3 && !isHeading(cleaned)) {
                    return cleaned;
                }
            }
        }
        return null;
    }

    private static String findPhone(String text) {
        if (text == null) {
            return null;
        }
        String flattened = text.replace('\n', ' ');
        Matcher matcher = PHONE.matcher(flattened);
        String best = null;
        while (matcher.find()) {
            String candidate = normalizePhone(matcher.group());
            if (candidate != null && (best == null || candidate.length() >= best.length())) {
                best = matcher.group();
            }
        }
        return best;
    }

    static String normalizePhone(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String digits = raw.replaceAll("\\D", "");
        if (digits.startsWith("00")) {
            digits = digits.substring(2);
        }
        if (digits.startsWith("216") && digits.length() >= 11) {
            digits = digits.substring(3);
        } else if (digits.startsWith("33") && digits.length() >= 11) {
            digits = digits.substring(2);
        }
        if (digits.startsWith("0") && digits.length() > 8) {
            digits = digits.substring(1);
        }
        if (digits.length() < 6 || digits.length() > 15) {
            return null;
        }
        return digits;
    }

    private static String cityFromAddress(String... candidates) {
        for (String candidate : candidates) {
            if (candidate == null) {
                continue;
            }
            String[] parts = candidate.split("[,/|]");
            String last = parts[parts.length - 1].replaceAll("\\d+", " ").replaceAll("\\s+", " ").trim();
            if (last.length() >= 2 && last.length() <= 80) {
                return last;
            }
        }
        return null;
    }

    private static String cityFromText(List<String> lines) {
        Pattern cities = Pattern.compile("(?i)\\b(tunis|ariana|ben arous|ezzahra|sousse|sfax|nabeul|bizerte|rades|la marsa|gammarth|ariana|paris|lyon|marseille|lille|toulouse|casablanca|rabat)\\b");
        int limit = Math.min(40, lines.size());
        for (int i = 0; i < limit; i++) {
            Matcher matcher = cities.matcher(lines.get(i));
            if (matcher.find()) {
                return titleCase(matcher.group(1));
            }
        }
        return null;
    }

    private static String cleanCity(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.replaceAll("(?i)\\b(france|tunisie|tunisia)\\b", "").replaceAll("\\s+", " ").trim();
        if (cleaned.length() < 2 || cleaned.length() > 80) {
            return null;
        }
        return titleCase(cleaned);
    }

    private static String cleanName(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.replaceAll("[^\\p{L} .'\\-]", " ").replaceAll("\\s+", " ").trim();
        if (cleaned.isBlank() || !PERSON_NAME.matcher(cleaned).matches()) {
            return null;
        }
        return titleCase(cleaned);
    }

    private static List<String> specialtiesOf(String text) {
        String folded = fold(text);
        List<String> found = new ArrayList<>();
        for (Map.Entry<String, String> alias : SPECIALTY_ALIASES.entrySet()) {
            if (folded.contains(alias.getKey()) && !found.contains(alias.getValue()) && SPECIALTIES.contains(alias.getValue())) {
                found.add(alias.getValue());
            }
        }
        return found;
    }

    private static List<String> skillsOf(List<String> lines) {
        String block = section(lines, Set.of("compétences", "competences", "skills", "spécialités", "specialites"));
        if (block == null) {
            return List.of();
        }
        List<String> tags = new ArrayList<>();
        for (String piece : block.split("[,;•|/\\n]")) {
            String tag = piece.replaceAll("(?i)^(compétences|skills)\\s*[:\\-]?", "").trim();
            if (tag.length() < 2 || tag.length() > 40 || isHeading(tag) || tags.contains(tag)) {
                continue;
            }
            tags.add(tag);
            if (tags.size() == 12) {
                break;
            }
        }
        return tags;
    }

    private static List<Map<String, String>> experiencesOf(List<String> lines) {
        String block = section(lines, Set.of(
                "expérience", "experience", "expériences", "experiences",
                "parcours", "parcours professionnel", "emploi"
        ));
        if (block == null) {
            return List.of();
        }
        List<Map<String, String>> items = new ArrayList<>();
        String[] rows = block.split("\n");
        for (int i = 0; i < rows.length && items.size() < 8; i++) {
            Matcher dates = YEAR_RANGE.matcher(rows[i]);
            if (!dates.find()) {
                continue;
            }
            String titleLine = i > 0 ? rows[i - 1].trim() : rows[i];
            if (isHeading(titleLine) || EMAIL.matcher(titleLine).find()) {
                continue;
            }
            String[] parts = titleLine.split("\\s[-–—|]\\s|,\\s+|\\s+chez\\s+|\\s+à\\s+", 2);
            String jobTitle = parts[0].trim();
            String company = parts.length > 1 ? parts[1].trim() : "";
            if (jobTitle.length() < 2) {
                continue;
            }
            Map<String, String> item = new LinkedHashMap<>();
            item.put("title", clip(jobTitle, 120));
            item.put("company", clip(company, 120) == null ? "" : clip(company, 120));
            item.put("start", toMonth(dates.group(1), dates.group(2)));
            item.put("end", isPresent(dates.group(4)) ? "" : toMonth(dates.group(3), dates.group(4)));
            item.put("description", "");
            items.add(item);
        }
        return items;
    }

    private static List<Map<String, String>> languagesOf(List<String> lines) {
        String block = section(lines, Set.of("langues", "languages", "langue"));
        if (block == null) {
            return List.of();
        }
        List<Map<String, String>> items = new ArrayList<>();
        for (String piece : block.split("[,;•|/\\n]")) {
            String row = piece.replaceAll("(?i)^langues?\\s*[:\\-]?", "").trim();
            if (row.length() < 2) {
                continue;
            }
            String level = "b2";
            String language = row;
            for (Map.Entry<String, String> entry : LANGUAGE_LEVELS.entrySet()) {
                if (fold(row).contains(entry.getKey())) {
                    level = entry.getValue();
                    language = row.replaceAll("(?i)[:(]?" + Pattern.quote(entry.getKey()) + "[)]?", "")
                            .replaceAll("[-–—]", " ")
                            .replaceAll("\\s+", " ")
                            .trim();
                    break;
                }
            }
            language = language.replaceAll("[():\\-]+", " ").replaceAll("\\s+", " ").trim();
            if (language.length() < 2 || language.length() > 40) {
                continue;
            }
            Map<String, String> item = new LinkedHashMap<>();
            item.put("language", titleCase(language));
            item.put("level", level);
            items.add(item);
            if (items.size() == 8) {
                break;
            }
        }
        return items;
    }

    private static String[] salaryOf(String text) {
        Matcher matcher = SALARY.matcher(text);
        if (!matcher.find()) {
            return new String[]{null, null};
        }
        String amount = matcher.group(1).replace(',', '.');
        String currency = switch (fold(matcher.group(2))) {
            case "dt", "tnd" -> "TND";
            case "eur", "€" -> "EUR";
            case "usd", "$" -> "USD";
            case "gbp" -> "GBP";
            case "mad" -> "MAD";
            default -> "TND";
        };
        return new String[]{amount, currency};
    }

    private static List<String> contractsOf(String text) {
        String folded = fold(text);
        List<String> found = new ArrayList<>();
        CONTRACTS.forEach((needle, value) -> {
            if (folded.contains(needle) && !found.contains(value)) {
                found.add(value);
            }
        });
        return found;
    }

    private static String availabilityOf(String text) {
        String folded = fold(text);
        if (folded.contains("immediat") || folded.contains("disponible maintenant") || folded.contains("de suite")) {
            return "immediate";
        }
        if (folded.contains("2 semaines") || folded.contains("deux semaines")) {
            return "2_weeks";
        }
        if (folded.contains("1 mois") || folded.contains("un mois")) {
            return "1_month";
        }
        return null;
    }

    private static String section(List<String> lines, Set<String> titles) {
        int start = -1;
        for (int i = 0; i < lines.size(); i++) {
            if (titles.contains(fold(headingKey(lines.get(i))))) {
                start = i + 1;
                break;
            }
        }
        if (start < 0) {
            return null;
        }
        StringBuilder body = new StringBuilder();
        for (int i = start; i < lines.size(); i++) {
            if (isHeading(lines.get(i)) && !titles.contains(fold(headingKey(lines.get(i))))) {
                break;
            }
            if (!body.isEmpty()) {
                body.append('\n');
            }
            body.append(lines.get(i));
        }
        String value = body.toString().trim();
        return value.isBlank() ? null : value;
    }

    private static boolean isHeading(String line) {
        return HEADINGS.contains(fold(headingKey(line)));
    }

    private static String headingKey(String line) {
        String collapsed = CvTextNormalizer.collapseSpacedGlyphs(line);
        return collapsed.replaceAll("[:：.\\d]", " ").replaceAll("\\s+", " ").trim();
    }

    private static String toMonth(String monthToken, String year) {
        String y = yearOf(year);
        if (y == null) {
            return "";
        }
        String month = "01";
        if (monthToken != null) {
            String key = fold(monthToken).replace(".", "").trim();
            for (Map.Entry<String, String> entry : MONTHS.entrySet()) {
                if (key.startsWith(entry.getKey())) {
                    month = entry.getValue();
                    break;
                }
            }
        }
        return y + "-" + month;
    }

    private static String yearOf(String raw) {
        if (raw == null) {
            return null;
        }
        Matcher matcher = Pattern.compile("(19|20)\\d{2}").matcher(raw);
        return matcher.find() ? matcher.group() : null;
    }

    private static boolean isPresent(String raw) {
        return raw != null && fold(raw).matches(".*(present|aujourd|en cours|actuel).*");
    }

    private static String clip(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.length() > max ? trimmed.substring(0, max).trim() : trimmed;
    }

    private static String titleCase(String value) {
        String[] parts = value.toLowerCase(Locale.ROOT).split(" ");
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            if (!out.isEmpty()) {
                out.append(' ');
            }
            out.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1));
        }
        return out.toString();
    }

    private static String fold(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT)
                .replace('é', 'e').replace('è', 'e').replace('ê', 'e')
                .replace('à', 'a').replace('â', 'a')
                .replace('î', 'i').replace('ï', 'i')
                .replace('ô', 'o').replace('ù', 'u').replace('û', 'u').replace('ç', 'c')
                .trim();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
