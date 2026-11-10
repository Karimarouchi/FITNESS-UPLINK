package com.fitnessuplink.common.seed;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * One ready-to-use login per role, for trying each workspace by hand. Every profile field the role has is filled,
 * documents included, and the role's own module gets some content.
 *
 * Accounts are checked one by one, so this also runs on a database {@link DemoDataSeeder} already filled, and an
 * account that exists is left alone. Each account gets an active Business plan and the unlock-all grant, because
 * search, jobs and contact are gated by plan.
 */
@Slf4j
@Component
@Order(110)
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.demo-seed", name = "enabled", havingValue = "true")
public class RoleAccountsSeeder implements ApplicationRunner {

    private static final String PASSWORD = "Demo1234!";
    private static final String DOMAIN = "@demo.fitnessuplink.test";
    private static final String UNSPLASH = "https://images.unsplash.com/%s?auto=format&fit=crop&w=900&q=70";
    private static final String VIDEO = "https://vimeo.com/76979871";

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(6))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private record Account(String login, String first, String last, String role, String intent, String trade, String establishment,
                           String city, String photo, String title, String specialties) {
        String email() {
            return login + DOMAIN;
        }

        boolean organization() {
            return trade != null;
        }
    }

    private record Upload(UUID id, String name, String contentType, long size) {
        String json() {
            return "{\"id\":\"%s\",\"name\":\"%s\",\"contentType\":\"%s\",\"size\":%d}".formatted(id, name, contentType, size);
        }
    }

    private static Account person(String login, String first, String last, String role, String intent, String city, String photo,
                                  String title, String specialties) {
        return new Account(login, first, last, role, intent, null, null, city, photo, title, specialties);
    }

    private static Account organization(String login, String first, String last, String role, String trade, String establishment, String city) {
        return new Account(login, first, last, role, null, trade, establishment, city, null, null, null);
    }

    private static final List<Account> ACCOUNTS = List.of(
            person("membre", "Salma", "Ayari", "MEMBER", null, "Tunis", "photo-1518611012118-696072aa579a", "Membre", "[\"Yoga\",\"Pilates\"]"),
            person("candidat", "Walid", "Ferchichi", "CANDIDATE", "JOB", "Sfax", "photo-1567013127542-490d757e51fc",
                    "Coach musculation", "[\"Musculation\",\"Préparation physique\"]"),
            person("coach", "Mariem", "Lahmar", "CANDIDATE", "COACHING", "Tunis", "photo-1571019613454-1cb2f99b2d8b",
                    "Coach HIIT & mobilité", "[\"HIIT\",\"Stretching & mobilité\",\"Cardio training\"]"),
            person("coach.candidat", "Hatem", "Bouzid", "CANDIDATE", "BOTH", "Sousse", "photo-1583454110551-21f2fa2afe61",
                    "Préparateur physique", "[\"Préparation physique\",\"CrossFit\"]"),
            person("role.coach", "Dorra", "Mejri", "COACH", null, "Nabeul", "photo-1518611012118-696072aa579a", "Coach Pilates", "[\"Pilates\"]"),
            organization("employeur", "Nizar", "Sellami", "EMPLOYER", "Atlas Fitness Clubs", "franchise", "Tunis"),
            organization("salle", "Rim", "Hammami", "GYM", "Olympe Gym Sousse", "gym", "Sousse"),
            organization("academie", "Fares", "Dridi", "ACADEMY", "Institut Sport Carthage", "academy", "Tunis"),
            organization("fournisseur", "Lina", "Gharsalli", "SUPPLIER", "ProGym Distribution", "other", "Sfax"),
            organization("prestataire", "Bilel", "Toumi", "SERVICE_PROVIDER", "FitOps Conseil", "other", "Tunis"),
            organization("organisateur", "Emna", "Riahi", "EVENT_ORGANIZER", "Tunis Fit Events", "other", "Tunis"),
            organization("createur", "Skander", "Ben Amor", "EXPERT_CREATOR", "Skander Coaching Studio", "studio", "La Marsa")
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String hash = passwordEncoder.encode(PASSWORD);
        int created = 0;
        for (Account account : ACCOUNTS) {
            Integer existing = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, account.email());
            if (existing != null && existing > 0) {
                continue;
            }
            UUID userId = insertUser(account, hash);
            fillProfile(userId, account);
            subscribe(userId, account);
            seedContent(userId, account);
            created++;
        }
        if (created > 0) {
            log.info("Role accounts seeded: {} created. They use the password {}", created, PASSWORD);
        }
        seedMemberActivity();
    }

    /**
     * Gives the member login something to show on its dashboard: sessions with the demo coach, an academy registration and
     * unread notifications. Runs once, while the member has no booking.
     *
     * The registration avoids PENDING_ON_SITE on purpose: once its session has passed, that status counts as a debt and locks the account.
     */
    private void seedMemberActivity() {
        UUID member = userId("membre");
        UUID coach = userId("coach");
        if (member == null || coach == null) {
            return;
        }
        Integer bookings = jdbc.queryForObject("SELECT COUNT(*) FROM coaching_bookings WHERE client_id = ?", Integer.class, member);
        if (bookings != null && bookings > 0) {
            return;
        }
        List<Map<String, Object>> services = jdbc.queryForList("""
                SELECT id, duration_minutes, price_amount, price_currency FROM coach_services WHERE coach_id = ? ORDER BY duration_minutes
                """, coach);
        if (services.isEmpty()) {
            return;
        }
        Object[][] sessions = {
                {1, LocalTime.of(10, 0), "CONFIRMED", 0},
                {1, LocalTime.of(16, 30), "AWAITING_PAYMENT", 1},
                {3, LocalTime.of(9, 0), "PENDING", 0},
                {6, LocalTime.of(11, 0), "CONFIRMED", 0},
                {-7, LocalTime.of(10, 0), "COMPLETED", 0},
                {-14, LocalTime.of(10, 0), "COMPLETED", 1},
        };
        for (Object[] session : sessions) {
            Map<String, Object> service = services.get(Math.min((int) session[3], services.size() - 1));
            jdbc.update("""
                    INSERT INTO coaching_bookings (id, coach_id, client_id, coach_service_id, scheduled_at, duration_minutes, status,
                                                   price_amount, price_currency, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
                    """, UUID.randomUUID(), coach, member, service.get("id"), ts(weekdayAt((int) session[0], (LocalTime) session[1])),
                    service.get("duration_minutes"), session[2], service.get("price_amount"), service.get("price_currency"));
        }

        List<UUID> formationSessions = jdbc.queryForList("""
                SELECT s.id FROM formation_sessions s JOIN formations f ON f.id = s.formation_id
                WHERE f.organizer_id = ? ORDER BY s.scheduled_at
                """, UUID.class, userId("academie"));
        if (!formationSessions.isEmpty()) {
            jdbc.update("""
                    INSERT INTO formation_registrations (id, session_id, member_id, status, waitlist_position, ticket_token, created_at, updated_at)
                    VALUES (?, ?, ?, 'WAITLISTED', 1, ?, now(), now())
                    """, UUID.randomUUID(), formationSessions.get(0), member, UUID.randomUUID().toString());
        }

        Object[][] notifications = {
                {"Séance confirmée", "Votre coach a confirmé votre prochaine séance individuelle.", "Voir mes séances", "/app/coaching/bookings", 2},
                {"Paiement en attente", "Réglez votre bilan pour bloquer le créneau.", "Payer", "/app/coaching/bookings", 20},
                {"Liste d'attente", "Vous êtes premier sur la liste d'attente de la Certification Coach Fitness.", "Voir", "/app/academy/registrations", 30},
        };
        for (Object[] notification : notifications) {
            jdbc.update("""
                    INSERT INTO notifications (id, user_id, title, message, action_label, action_path, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, UUID.randomUUID(), member, notification[0], notification[1], notification[2], notification[3],
                    ts(Instant.now().minus((int) notification[4], ChronoUnit.HOURS)));
        }
        log.info("Member demo activity seeded");
    }

    private UUID userId(String login) {
        List<UUID> ids = jdbc.queryForList("SELECT id FROM users WHERE email = ?", UUID.class, login + DOMAIN);
        return ids.isEmpty() ? null : ids.get(0);
    }

    /** That many days from today at this time, moved to the Monday when it lands on a weekend: the coach only works weekdays. */
    private static Instant weekdayAt(int days, LocalTime time) {
        ZoneId zone = ZoneId.of("Africa/Tunis");
        LocalDate date = LocalDate.now(zone).plusDays(days);
        while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.plusDays(1);
        }
        return date.atTime(time).atZone(zone).toInstant();
    }

    private UUID insertUser(Account account, String hash) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users (id, email, display_name, password_hash, first_name, last_name, enabled, role_id, country_id,
                                   onboarding_completed, verification_status, professional_intent, profile_visible, email_verified,
                                   selected_plan, selected_plan_interval, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, TRUE, 'verified', ?, TRUE, TRUE, 'BUSINESS', 'YEARLY', now(), now())
                """, id, account.email(), account.first() + " " + account.last(), hash, account.first(), account.last(),
                roleId(account.role()), countryId("TN"), account.intent());
        return id;
    }

    /** Walks the fields the role really has, so a field added later shows up in the log instead of staying blank unnoticed. */
    private void fillProfile(UUID userId, Account account) {
        Map<String, String> values = account.organization() ? organizationValues(account) : personValues(account);
        List<Map<String, Object>> fields = jdbc.queryForList("""
                SELECT f.field_key, f.field_type FROM role_profile_fields rf
                JOIN profile_fields f ON f.id = rf.field_id
                JOIN roles r ON r.id = rf.role_id
                WHERE r.code = ?
                """, account.role());
        for (Map<String, Object> field : fields) {
            String key = (String) field.get("field_key");
            String value = switch ((String) field.get("field_type")) {
                case "PHOTO" -> "[" + photo(userId, account, key).json() + "]";
                case "FILE", "FILES" -> "[" + (key.contains("photo") ? photo(userId, account, key) : document(userId, account, key)).json() + "]";
                default -> values.get(key);
            };
            if (value == null) {
                log.warn("Role account {}: no seed value for field {}", account.login(), key);
                continue;
            }
            jdbc.update("INSERT INTO user_profile_values (user_id, field_key, value) VALUES (?, ?, ?)", userId, key, value);
        }
    }

    private Map<String, String> personValues(Account a) {
        Map<String, String> v = new HashMap<>();
        String tn = countryId("TN").toString();
        String fr = countryId("FR").toString();
        v.put("first_name", a.first());
        v.put("last_name", a.last());
        v.put("date_of_birth", "1994-03-18");
        v.put("gender", "prefer_not");
        v.put("city", a.city());
        v.put("phone", "+21620000" + String.format("%03d", Math.abs(a.login().hashCode()) % 1000));
        v.put("language", "fr");
        v.put("about", "Passionné(e) de sport, " + a.first() + " s'entraîne quatre fois par semaine à " + a.city() + ".");
        v.put("fitness_goal", "Gagner en force et garder une bonne mobilité");
        v.put("specialty", a.title());
        v.put("years_experience", "6");
        v.put("identity_document_type", "cin");
        v.put("identity_document_number", "09" + String.format("%06d", Math.abs(a.login().hashCode()) % 1000000));
        v.put("professional_title", a.title());
        v.put("biography", a.first() + " accompagne ses clients depuis six ans à " + a.city()
                + ". Séances structurées, objectifs mesurés et suivi régulier.");
        v.put("specialties", a.specialties());
        v.put("skills", "[\"Programmation\",\"Suivi client\",\"Évaluation physique\"]");
        v.put("experiences", """
                [{"title":"%s","company":"California Gym Tunis","start":"2021-01","end":"2024-06","description":"Suivi de 40 adhérents, cours collectifs et bilans."},\
                {"title":"Assistant coach","company":"Club Sportif de %s","start":"2019-02","end":"2020-12","description":"Encadrement des groupes jeunes."}]\
                """.formatted(a.title(), a.city()));
        v.put("educations", """
                [{"school":"ISSEP Ksar Saïd","diploma":"Licence STAPS","year":"2018","notes":"Spécialité entraînement sportif"}]""");
        v.put("spoken_languages", "[{\"language\":\"francais\",\"level\":\"c1\"},{\"language\":\"arabe\",\"level\":\"c2\"},{\"language\":\"anglais\",\"level\":\"b2\"}]");
        v.put("presentation_videos", "[\"" + VIDEO + "\"]");
        v.put("video_links", "[{\"url\":\"" + VIDEO + "\"}]");
        v.put("professional_references", """
                [{"name":"Sonia Mabrouk","role":"Responsable de club","company":"California Gym Tunis","contact":"+21620000900"}]""");
        v.put("availability", "2_weeks");
        v.put("group_class_slots", "[\"Lundi 18h\",\"Jeudi 19h\"]");
        v.put("desired_salary", "{\"amount\":\"2800\",\"currency\":\"TND\"}");
        v.put("contract_types", "[\"cdi\",\"freelance\"]");
        v.put("current_country", tn);
        v.put("target_countries", "[\"" + tn + "\",\"" + fr + "\"]");
        v.put("willing_to_relocate", "yes");
        v.put("preferred_zones", "[\"tunis\",\"ariana\",\"sousse\"]");
        v.put("international_mission", "yes");
        return v;
    }

    private Map<String, String> organizationValues(Account a) {
        Map<String, String> v = new HashMap<>();
        String tn = countryId("TN").toString();
        String slug = a.login();
        v.put("trade_name", a.trade());
        v.put("legal_name", a.trade() + " SARL");
        v.put("organization_description", a.trade() + " est basée à " + a.city() + " et travaille avec les professionnels du fitness en Tunisie.");
        v.put("establishment_type", a.establishment());
        v.put("org_country", tn);
        v.put("org_city", a.city());
        v.put("org_address", "12 avenue Habib Bourguiba, " + a.city());
        v.put("website", "https://" + slug + ".fitnessuplink.test");
        v.put("social_networks", "[{\"network\":\"instagram\",\"url\":\"https://instagram.com/" + slug + "\"},{\"network\":\"facebook\",\"url\":\"https://facebook.com/" + slug + "\"}]");
        v.put("org_phone", "+21671000" + String.format("%03d", Math.abs(slug.hashCode()) % 1000));
        v.put("org_email", a.email());
        v.put("patente_number", "PAT-" + slug.toUpperCase());
        v.put("trade_register_number", "RC-" + slug.toUpperCase());
        v.put("tax_id", "MF-" + slug.toUpperCase());
        v.put("legal_representative", """
                [{"name":"%s %s","title":"Gérant(e)","id_number":"09112233","email":"%s","phone":"+21620000800"}]\
                """.formatted(a.first(), a.last(), a.email()));
        v.put("identity_document_type", "cin");
        v.put("identity_document_number", "09112233");
        v.put("representative_cin", "09112233");
        v.put("recruitment_history", "[{\"role\":\"Coach sportif\",\"year\":\"2025\",\"count\":\"4\",\"notes\":\"Ouverture d'un nouveau site\"}]");
        v.put("verification_status", "verified");
        v.put("coverage_countries", "[\"" + tn + "\",\"" + countryId("FR") + "\"]");
        v.put("portfolio_videos", "[\"" + VIDEO + "\"]");
        return v;
    }

    private void subscribe(UUID userId, Account account) {
        UUID planId = jdbc.queryForObject("""
                SELECT p.id FROM billing_plans p
                JOIN billing_family_roles r ON r.family_id = p.family_id
                WHERE r.role_code = ? AND p.code = 'BUSINESS'
                """, UUID.class, account.role());
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO billing_subscriptions (id, user_id, plan_id, status, interval, currency, current_period_end, created_at, updated_at)
                VALUES (?, ?, ?, 'ACTIVE', 'YEARLY', 'TND', ?, ?, ?)
                """, UUID.randomUUID(), userId, planId, ts(now.plus(365, ChronoUnit.DAYS)), ts(now), ts(now));
        jdbc.update("INSERT INTO billing_grants (user_id, entitlement_code) VALUES (?, 'billing.unlock_all')", userId);
    }

    /** EVENT_ORGANIZER and EXPERT_CREATOR have no module tables yet, so their accounts stop at the profile. */
    private void seedContent(UUID userId, Account account) {
        switch (account.role()) {
            case "CANDIDATE" -> {
                if (!"JOB".equals(account.intent())) {
                    seedCoaching(userId);
                }
            }
            case "COACH" -> seedCoaching(userId);
            case "EMPLOYER", "GYM" -> seedJobs(userId, account);
            case "ACADEMY" -> seedFormation(userId, account);
            case "SUPPLIER" -> seedProducts(userId, account);
            case "SERVICE_PROVIDER" -> seedProviderServices(userId);
            default -> {
            }
        }
    }

    private void seedCoaching(UUID coachId) {
        Object[][] services = {
                {"Séance individuelle", "Séance d'une heure adaptée à votre niveau, avec bilan rapide en fin de séance.", 60, 90},
                {"Bilan + programme 4 semaines", "Évaluation complète et programme personnalisé sur quatre semaines.", 90, 180},
        };
        for (Object[] service : services) {
            jdbc.update("""
                    INSERT INTO coach_services (id, coach_id, name, description, duration_minutes, price_amount, price_currency, active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'TND', TRUE, now(), now())
                    """, UUID.randomUUID(), coachId, service[0], service[1], service[2], BigDecimal.valueOf((int) service[3]));
        }
        // day_of_week: 0 is Sunday, so 1 to 5 is Monday to Friday
        for (short day = 1; day <= 5; day++) {
            jdbc.update("""
                    INSERT INTO coach_availability_rules (id, coach_id, day_of_week, start_time, end_time, active)
                    VALUES (?, ?, ?, ?, ?, TRUE)
                    """, UUID.randomUUID(), coachId, day, Time.valueOf(LocalTime.of(9, 0)), Time.valueOf(LocalTime.of(17, 0)));
        }
    }

    private void seedJobs(UUID employerId, Account account) {
        Object[][] jobs = {
                {"Coach sportif — " + account.city(), "Coach sportif", "cdi", "2400", "2 ans minimum"},
                {"Instructeur cours collectifs", "Instructeur", "part_time", "1200", "1 an"},
        };
        for (Object[] job : jobs) {
            jdbc.update("""
                    INSERT INTO job_offers (id, employer_id, title, position, location, contract_type, salary_amount, salary_currency, languages, experience, description, status, expires_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'TND', '["Français","Arabe"]', ?, ?, 'PUBLISHED', ?, now(), now())
                    """, UUID.randomUUID(), employerId, job[0], job[1], account.city(), job[2], job[3], job[4],
                    "Rejoignez " + account.trade() + " : équipe soudée, planning stable et formation continue.",
                    ts(Instant.now().plus(60, ChronoUnit.DAYS)));
        }
    }

    private void seedFormation(UUID organizerId, Account account) {
        Upload image = picture(organizerId, account, "formation_image", "photo-1517838277536-f5f99be501cd", "formation.jpg");
        UUID formationId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO formations (id, organizer_id, content_type, title, trainer_name, description, language, location, is_online, price_amount, price_currency, has_certification, image_upload_id, active, created_at, updated_at)
                VALUES (?, ?, 'CERTIFICATION', 'Certification Coach Fitness niveau 1', ?, ?, 'Français', ?, FALSE, 750, 'TND', TRUE, ?, TRUE, now(), now())
                """, formationId, organizerId, account.first() + " " + account.last(),
                "Trois jours pour apprendre à évaluer, programmer et encadrer. Examen pratique et certificat en fin de parcours.",
                account.city(), image.id());
        for (int session = 0; session < 2; session++) {
            Instant at = Instant.now().plus(14 + session * 21L, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS);
            jdbc.update("""
                    INSERT INTO formation_sessions (id, formation_id, scheduled_at, duration_minutes, capacity, status, created_at, updated_at)
                    VALUES (?, ?, ?, 480, 20, 'SCHEDULED', now(), now())
                    """, UUID.randomUUID(), formationId, ts(at));
        }
    }

    private void seedProducts(UUID supplierId, Account account) {
        UUID categoryId = jdbc.queryForObject("SELECT id FROM product_categories ORDER BY name LIMIT 1", UUID.class);
        Object[][] products = {
                {"Banc de musculation réglable", 780, "photo-1534438327276-14e5300c3a48", "Sept positions, charge maximale 300 kg, housse renforcée."},
                {"Lot de kettlebells 4–24 kg", 1150, "photo-1517836357463-d25dfeac3438", "Six kettlebells en fonte, poignées lisses, marquage couleur."},
        };
        for (Object[] product : products) {
            Upload photo = picture(supplierId, account, "product_photo", (String) product[2], "product.jpg");
            jdbc.update("""
                    INSERT INTO products (id, supplier_id, category_id, name, brand, description, price_amount, price_currency, photos_json, active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'TND', ?, TRUE, now(), now())
                    """, UUID.randomUUID(), supplierId, categoryId, product[0], "ProGym", product[3], BigDecimal.valueOf((int) product[1]),
                    "[{\"id\":\"" + photo.id() + "\"}]");
        }
    }

    private void seedProviderServices(UUID providerId) {
        Map<String, String> services = new LinkedHashMap<>();
        services.put("Audit d'exploitation de salle", "Analyse du planning, de la fréquentation et de la rentabilité, avec plan d'action sur 90 jours.");
        services.put("Aménagement de plateau", "Plan d'implantation des machines et circulation, de l'esquisse à la livraison.");
        List<UUID> categories = jdbc.queryForList("SELECT id FROM service_categories WHERE active ORDER BY sort_order", UUID.class);
        int index = 0;
        for (Map.Entry<String, String> service : services.entrySet()) {
            jdbc.update("""
                    INSERT INTO provider_services (id, provider_id, category_id, name, description, active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, TRUE, now(), now())
                    """, UUID.randomUUID(), providerId, categories.get(index++ % categories.size()), service.getKey(), service.getValue());
        }
    }

    private Upload photo(UUID userId, Account account, String fieldKey) {
        if ("professional_photo".equals(fieldKey) && account.photo() != null) {
            return picture(userId, account, fieldKey, account.photo(), "portrait.jpg");
        }
        return store(userId, fieldKey, fieldKey + ".png", "image/png", initialsImage(account));
    }

    /** A stock photo, or the initials image when the download fails: seeding must not depend on the network. */
    private Upload picture(UUID userId, Account account, String fieldKey, String unsplashId, String filename) {
        byte[] bytes = download(String.format(UNSPLASH, unsplashId));
        if (bytes == null) {
            return store(userId, fieldKey, fieldKey + ".png", "image/png", initialsImage(account));
        }
        return store(userId, fieldKey, filename, "image/jpeg", bytes);
    }

    private Upload document(UUID userId, Account account, String fieldKey) {
        String holder = account.organization() ? account.trade() : account.first() + " " + account.last();
        return store(userId, fieldKey, fieldKey + ".pdf", "application/pdf", pdf("Document de demonstration - " + fieldKey, ascii(holder)));
    }

    private Upload store(UUID userId, String fieldKey, String filename, String contentType, byte[] bytes) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO user_uploads (id, user_id, field_key, original_filename, content_type, size_bytes, content, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, now())
                """, id, userId, fieldKey, filename, contentType, (long) bytes.length, bytes);
        return new Upload(id, filename, contentType, bytes.length);
    }

    private byte[] download(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(12)).GET().build();
            HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
            return response.statusCode() == 200 && response.body().length >= 1024 ? response.body() : null;
        } catch (IOException ex) {
            log.warn("Role account image skipped: {} ({})", url, ex.getMessage());
            return null;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return null;
        }
    }

    private static byte[] initialsImage(Account account) {
        String label = account.organization() ? account.trade() : account.first() + " " + account.last();
        String[] words = label.split(" ");
        String initials = (words[0].substring(0, 1) + words[words.length - 1].substring(0, 1)).toUpperCase();
        int size = 320;
        BufferedImage image = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        graphics.setColor(new Color(0x0B1A33));
        graphics.fillRect(0, 0, size, size);
        graphics.setColor(new Color(0xFC5101));
        graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 130));
        int width = graphics.getFontMetrics().stringWidth(initials);
        graphics.drawString(initials, (size - width) / 2, 208);
        graphics.dispose();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Could not draw a demo image", ex);
        }
    }

    /** A one-page PDF with two lines of text, so document previews open on something real. */
    private static byte[] pdf(String title, String subtitle) {
        String content = "BT /F1 18 Tf 60 760 Td (" + title + ") Tj 0 -28 Td /F1 13 Tf (" + subtitle + ") Tj ET";
        List<String> objects = new ArrayList<>(List.of(
                "<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
                "<< /Length " + content.length() + " >>\nstream\n" + content + "\nendstream",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
        StringBuilder out = new StringBuilder("%PDF-1.4\n");
        List<Integer> offsets = new ArrayList<>();
        for (int i = 0; i < objects.size(); i++) {
            offsets.add(out.length());
            out.append(i + 1).append(" 0 obj\n").append(objects.get(i)).append("\nendobj\n");
        }
        int xref = out.length();
        out.append("xref\n0 ").append(objects.size() + 1).append("\n0000000000 65535 f \n");
        for (int offset : offsets) {
            out.append(String.format("%010d 00000 n \n", offset));
        }
        out.append("trailer\n<< /Size ").append(objects.size() + 1).append(" /Root 1 0 R >>\nstartxref\n").append(xref).append("\n%%EOF\n");
        return out.toString().getBytes(StandardCharsets.ISO_8859_1);
    }

    /** The PDF above uses a plain Type 1 font and a literal string, so accents and parentheses stay out of it. */
    private static String ascii(String value) {
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD).replaceAll("[^\\x20-\\x7E]|[()\\\\]", "");
    }

    private UUID roleId(String code) {
        return jdbc.queryForObject("SELECT id FROM roles WHERE code = ?", UUID.class, code);
    }

    private UUID countryId(String iso2) {
        return jdbc.queryForObject("SELECT id FROM countries WHERE iso2 = ?", UUID.class, iso2);
    }

    private static Timestamp ts(Instant instant) {
        return Timestamp.from(instant);
    }
}
