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

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@Order(100)
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.demo-seed", name = "enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

    static final String MARKER_EMAIL = "sarah.benali@demo.fitnessuplink.test";
    private static final String PASSWORD = "Demo1234!";
    private static final String UNSPLASH = "https://images.unsplash.com/%s?auto=format&fit=crop&w=900&q=70";

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(6))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private record Person(String email, String first, String last, String role, String country, String intent) {
    }

    private record Coach(Person person, String title, String city, String specialties, String bio, String photo,
                         String service, int minutes, int price) {
    }

    private record Org(Person person, String tradeName, String city) {
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Integer existing = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, MARKER_EMAIL);
        if (existing != null && existing > 0) {
            return;
        }
        log.info("Seeding demo data (app.demo-seed.enabled=true)");
        String hash = passwordEncoder.encode(PASSWORD);

        List<UUID> members = List.of(
                insertUser(new Person("ines.trabelsi@demo.fitnessuplink.test", "Inès", "Trabelsi", "MEMBER", "TN", null), hash),
                insertUser(new Person("youssef.mansour@demo.fitnessuplink.test", "Youssef", "Mansour", "MEMBER", "TN", null), hash),
                insertUser(new Person("claire.dubois@demo.fitnessuplink.test", "Claire", "Dubois", "MEMBER", "FR", null), hash)
        );

        List<Coach> coaches = List.of(
                new Coach(new Person(MARKER_EMAIL, "Sarah", "Benali", "CANDIDATE", "TN", "BOTH"),
                        "Coach performance", "Tunis", "[\"HIIT\",\"Mobilité\",\"Perte de poids\"]",
                        "Head coach depuis 8 ans, ancienne préparatrice physique en handball. Programmes courts, mesurables, sans blabla.",
                        "photo-1571019613454-1cb2f99b2d8b", "Séance HIIT individuelle", 60, 90),
                new Coach(new Person("karim.haddad@demo.fitnessuplink.test", "Karim", "Haddad", "CANDIDATE", "TN", "COACHING"),
                        "Préparateur physique", "Sousse", "[\"Force\",\"Préparation sportive\",\"Hypertrophie\"]",
                        "Préparation physique pour athlètes amateurs et semi-pros. Spécialiste force et puissance.",
                        "photo-1567013127542-490d757e51fc", "Bilan force + programme 4 semaines", 75, 140),
                new Coach(new Person("lea.martin@demo.fitnessuplink.test", "Léa", "Martin", "CANDIDATE", "FR", "COACHING"),
                        "Coach Pilates & posture", "Lyon", "[\"Pilates\",\"Posture\",\"Pré/post-natal\"]",
                        "Certifiée Pilates matwork et reformer. Travail postural, gainage profond, retour au sport après grossesse.",
                        "photo-1518611012118-696072aa579a", "Pilates reformer privé", 50, 70),
                new Coach(new Person("omar.saidi@demo.fitnessuplink.test", "Omar", "Saidi", "CANDIDATE", "AE", "BOTH"),
                        "Coach HYROX", "Dubaï", "[\"HYROX\",\"Endurance\",\"Cross training\"]",
                        "Finisher HYROX Elite 15. Préparation compétition, ergos, sled push et stratégie de course.",
                        "photo-1583454110551-21f2fa2afe61", "Prépa HYROX — séance technique", 60, 180)
        );

        int reviewIndex = 0;
        String[] comments = {
                "Séances intenses mais très bien dosées. Résultats visibles en un mois.",
                "Super pédagogue, programme clair et suivi régulier.",
                "Exactement ce qu'il me fallait pour reprendre après une blessure.",
                "Coach très pro, ponctuel et à l'écoute.",
                "Préparation au top, j'ai battu mon record.",
        };
        for (Coach coach : coaches) {
            UUID coachId = insertUser(coach.person(), hash);
            profile(coachId, "professional_title", coach.title());
            profile(coachId, "city", coach.city());
            profile(coachId, "specialties", coach.specialties());
            profile(coachId, "biography", coach.bio());
            UUID photo = image(coachId, "professional_photo", coach.photo(), "portrait.jpg");
            if (photo != null) {
                profile(coachId, "professional_photo", "[{\"id\":\"" + photo + "\"}]");
            }
            UUID serviceId = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO coach_services (id, coach_id, name, description, duration_minutes, price_amount, price_currency, active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, now(), now())
                    """, serviceId, coachId, coach.service(), coach.bio(), coach.minutes(), BigDecimal.valueOf(coach.price()), "TND");
            for (int i = 0; i < members.size(); i++) {
                if ((reviewIndex + i) % 4 == 3) {
                    continue;
                }
                UUID bookingId = UUID.randomUUID();
                Instant at = Instant.now().minus(7L * (i + 1) + reviewIndex, ChronoUnit.DAYS);
                jdbc.update("""
                        INSERT INTO coaching_bookings (id, coach_id, client_id, coach_service_id, scheduled_at, duration_minutes, status, price_amount, price_currency, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, 'TND', ?, ?)
                        """, bookingId, coachId, members.get(i), serviceId, ts(at), coach.minutes(), BigDecimal.valueOf(coach.price()), ts(at), ts(at));
                jdbc.update("""
                        INSERT INTO coaching_reviews (id, booking_id, coach_id, client_id, rating, comment, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, UUID.randomUUID(), bookingId, coachId, members.get(i), (short) (i == 2 ? 4 : 5),
                        comments[(reviewIndex + i) % comments.length], ts(at.plus(1, ChronoUnit.DAYS)));
            }
            reviewIndex++;
        }

        seedTalents(hash);
        seedMarketplace(hash);
        seedAcademy(hash);
        seedJobs(hash);
        log.info("Demo data seeded. Demo accounts use the password {}", PASSWORD);
    }

    private void seedTalents(String hash) {
        List<Person> talents = List.of(
                new Person("amine.gharbi@demo.fitnessuplink.test", "Amine", "Gharbi", "CANDIDATE", "TN", "JOB"),
                new Person("nour.belhadj@demo.fitnessuplink.test", "Nour", "Belhadj", "CANDIDATE", "TN", "JOB")
        );
        String[][] meta = {
                {"Coach musculation", "Tunis", "[\"Musculation\",\"Remise en forme\"]"},
                {"Instructrice cours collectifs", "Sfax", "[\"Cycling\",\"Body pump\",\"Zumba\"]"},
        };
        for (int i = 0; i < talents.size(); i++) {
            UUID id = insertUser(talents.get(i), hash);
            profile(id, "professional_title", meta[i][0]);
            profile(id, "city", meta[i][1]);
            profile(id, "specialties", meta[i][2]);
        }
    }

    private void seedMarketplace(String hash) {
        Org[] suppliers = {
                new Org(new Person("contact@ironline.demo.fitnessuplink.test", "Mehdi", "Kallel", "SUPPLIER", "TN", null), "IronLine Equipment", "Tunis"),
                new Org(new Person("ventes@cardiopro.demo.fitnessuplink.test", "Julie", "Moreau", "SUPPLIER", "FR", null), "CardioPro Distribution", "Marseille"),
        };
        UUID[] supplierIds = new UUID[suppliers.length];
        for (int i = 0; i < suppliers.length; i++) {
            supplierIds[i] = insertUser(suppliers[i].person(), hash);
            profile(supplierIds[i], "trade_name", suppliers[i].tradeName());
            profile(supplierIds[i], "org_city", suppliers[i].city());
        }
        Map<String, UUID> categories = categories();
        Object[][] products = {
                {0, "Machines de musculation", "Rack de musculation Pro", "IronLine", 1290, "photo-1534438327276-14e5300c3a48",
                        "Rack acier 3 mm, J-hooks réglables, barre de traction multi-prises. Charge max 450 kg."},
                {0, "Accessoires", "Set haltères hexagonaux 2–30 kg", "IronLine", 1450, "photo-1517836357463-d25dfeac3438",
                        "15 paires caoutchoutées, poignées chromées moletées, rack 3 niveaux inclus."},
                {1, "Cardio", "Tapis de course commercial T9", "CardioPro", 6900, "photo-1576678927484-cc907957088c",
                        "Moteur AC 4 CV, 0,8–22 km/h, inclinaison 15 %, usage intensif 16 h/jour."},
                {1, "Cardio", "Rameur air RW-500", "CardioPro", 2350, "photo-1540497077202-7c8a3999166f",
                        "Résistance air + magnétique, écran performance, compatible Bluetooth."},
                {0, "Cross Training", "Kit cross training 8 postes", "IronLine", 3200, "photo-1574680096145-d05b474e2155",
                        "Kettlebells, wall balls, slam balls, box jump et cordes ondulatoires pour un box complet."},
                {1, "Pilates", "Reformer Pilates Studio", "CardioPro", 4800, "photo-1518611012118-696072aa579a",
                        "Cadre aluminium, 5 ressorts, tour de rangement. Livré et installé."},
                {0, "HYROX", "Sled de poussée HYROX", "IronLine", 980, "photo-1599058917212-d750089bc07e",
                        "Sled homologué compétition, patins interchangeables, poignées hautes et basses."},
                {1, "Récupération", "Pistolet de massage Pro", "CardioPro", 390, "photo-1571019614242-c5c5dee9f50b",
                        "6 têtes, 5 vitesses, autonomie 6 h. Idéal pour la récupération en salle."},
        };
        int offset = 0;
        for (Object[] p : products) {
            UUID supplierId = supplierIds[(int) p[0]];
            UUID categoryId = categories.getOrDefault((String) p[1], categories.values().iterator().next());
            UUID photo = image(supplierId, "product_photo", (String) p[5], "product.jpg");
            String photos = photo == null ? null : "[{\"id\":\"" + photo + "\"}]";
            Instant created = Instant.now().minus(offset++, ChronoUnit.HOURS);
            jdbc.update("""
                    INSERT INTO products (id, supplier_id, category_id, name, brand, description, price_amount, price_currency, photos_json, active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'TND', ?, TRUE, ?, ?)
                    """, UUID.randomUUID(), supplierId, categoryId, p[2], p[3], p[6], BigDecimal.valueOf((int) p[4]), photos, ts(created), ts(created));
        }
    }

    private void seedAcademy(String hash) {
        Org[] academies = {
                new Org(new Person("hello@elite-academy.demo.fitnessuplink.test", "Rania", "Chaabane", "ACADEMY", "TN", null), "Elite Fitness Academy", "Tunis"),
                new Org(new Person("contact@movelab.demo.fitnessuplink.test", "Thomas", "Bernard", "ACADEMY", "FR", null), "MoveLab Institut", "Paris"),
        };
        UUID[] ids = new UUID[academies.length];
        for (int i = 0; i < academies.length; i++) {
            ids[i] = insertUser(academies[i].person(), hash);
            profile(ids[i], "trade_name", academies[i].tradeName());
            profile(ids[i], "org_city", academies[i].city());
        }
        Object[][] formations = {
                {0, "CERTIFICATION", "Certification Coach HIIT niveau 1", "Sarah Benali", "Français", "Tunis", false, 650, true, "photo-1517838277536-f5f99be501cd",
                        "Deux jours pour concevoir, encadrer et adapter des séances HIIT sûres et efficaces. Examen pratique et certificat."},
                {1, "MASTERCLASS", "Masterclass mobilité & prévention des blessures", "Thomas Bernard", "Français", null, true, 180, false, "photo-1571019614242-c5c5dee9f50b",
                        "Trois heures en ligne : évaluation de la mobilité, routines correctives et intégration dans vos programmes."},
                {0, "WORKSHOP", "Workshop HYROX : stations & stratégie", "Omar Saidi", "Anglais", "Tunis", false, 320, false, "photo-1517963879433-6ad2b056d712",
                        "Atelier pratique sur les 8 stations HYROX, gestion de l'effort et transitions."},
                {1, "FORMATION", "Nutrition du sportif — les fondamentaux", "Claire Dubois", "Français", null, true, 240, true, "photo-1490645935967-10de6ba17061",
                        "Macro-nutriments, timing, hydratation et compléments : une base solide pour conseiller vos clients."},
        };
        int day = 6;
        for (Object[] f : formations) {
            UUID organizerId = ids[(int) f[0]];
            UUID image = image(organizerId, "formation_image", (String) f[9], "formation.jpg");
            UUID formationId = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO formations (id, organizer_id, content_type, title, trainer_name, description, language, location, is_online, price_amount, price_currency, has_certification, image_upload_id, active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TND', ?, ?, TRUE, now(), now())
                    """, formationId, organizerId, f[1], f[2], f[3], f[10], f[4], f[5], f[6], BigDecimal.valueOf((int) f[7]), f[8], image);
            for (int s = 0; s < 2; s++) {
                Instant at = Instant.now().plus(day + s * 21L, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS);
                jdbc.update("""
                        INSERT INTO formation_sessions (id, formation_id, scheduled_at, duration_minutes, capacity, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, 'SCHEDULED', now(), now())
                        """, UUID.randomUUID(), formationId, ts(at), (boolean) f[6] ? 180 : 480, 20);
            }
            day += 5;
        }
    }

    private void seedJobs(String hash) {
        Org[] employers = {
                new Org(new Person("rh@urbanfit.demo.fitnessuplink.test", "Sami", "Jaziri", "EMPLOYER", "TN", null), "UrbanFit Clubs", "Tunis"),
                new Org(new Person("jobs@pulsegym.demo.fitnessuplink.test", "Aya", "Khalil", "GYM", "AE", null), "Pulse Gym Dubai", "Dubaï"),
        };
        UUID[] ids = new UUID[employers.length];
        for (int i = 0; i < employers.length; i++) {
            ids[i] = insertUser(employers[i].person(), hash);
            profile(ids[i], "trade_name", employers[i].tradeName());
            profile(ids[i], "org_city", employers[i].city());
        }
        Object[][] jobs = {
                {0, "Head coach — club Lac 2", "Head coach", "Tunis, Lac 2", "cdi", "3500", "TND", "3 ans minimum"},
                {0, "Instructeur cours collectifs", "Instructeur", "Sousse", "part_time", "1400", "TND", "1 an"},
                {1, "Personal trainer — clientèle premium", "Personal trainer", "Dubaï Marina", "cdi", "14000", "AED", "4 ans minimum"},
                {1, "Coach HYROX freelance", "Coach HYROX", "Dubaï", "freelance", "350", "AED", "Certification HYROX"},
        };
        int offset = 0;
        for (Object[] j : jobs) {
            Instant created = Instant.now().minus(offset++, ChronoUnit.DAYS);
            jdbc.update("""
                    INSERT INTO job_offers (id, employer_id, title, position, location, contract_type, salary_amount, salary_currency, languages, experience, description, status, expires_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '["Français","Anglais"]', ?, ?, 'PUBLISHED', ?, ?, ?)
                    """, UUID.randomUUID(), ids[(int) j[0]], j[1], j[2], j[3], j[4], j[5], j[6], j[7],
                    "Rejoignez une équipe exigeante. Planning stable, formation continue et évolution rapide.",
                    ts(Instant.now().plus(60, ChronoUnit.DAYS)), ts(created), ts(created));
        }
    }

    private UUID insertUser(Person person, String hash) {
        UUID id = UUID.randomUUID();
        UUID roleId = jdbc.queryForObject("SELECT id FROM roles WHERE code = ?", UUID.class, person.role());
        UUID countryId = jdbc.queryForObject("SELECT id FROM countries WHERE iso2 = ?", UUID.class, person.country());
        jdbc.update("""
                INSERT INTO users (id, email, display_name, password_hash, first_name, last_name, enabled, role_id, country_id,
                                   onboarding_completed, verification_status, professional_intent, profile_visible, email_verified, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, TRUE, 'verified', ?, TRUE, TRUE, now(), now())
                """, id, person.email(), person.first() + " " + person.last(), hash, person.first(), person.last(),
                roleId, countryId, person.intent());
        return id;
    }

    private void profile(UUID userId, String key, String value) {
        jdbc.update("INSERT INTO user_profile_values (user_id, field_key, value) VALUES (?, ?, ?)", userId, key, value);
    }

    private Map<String, UUID> categories() {
        return jdbc.query("SELECT id, name FROM product_categories", rs -> {
            Map<String, UUID> out = new java.util.LinkedHashMap<>();
            while (rs.next()) {
                out.put(rs.getString("name"), rs.getObject("id", UUID.class));
            }
            return out;
        });
    }

    private UUID image(UUID userId, String fieldKey, String unsplashId, String filename) {
        byte[] bytes = download(String.format(UNSPLASH, unsplashId));
        if (bytes == null) {
            return null;
        }
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO user_uploads (id, user_id, field_key, original_filename, content_type, size_bytes, content, created_at)
                VALUES (?, ?, ?, ?, 'image/jpeg', ?, ?, now())
                """, id, userId, fieldKey, filename, (long) bytes.length, bytes);
        return id;
    }

    private byte[] download(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(12)).GET().build();
            HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200 || response.body().length < 1024) {
                log.warn("Demo image skipped ({}): {}", response.statusCode(), url);
                return null;
            }
            return response.body();
        } catch (Exception ex) {
            log.warn("Demo image skipped: {} ({})", url, ex.getMessage());
            return null;
        }
    }

    private static Timestamp ts(Instant instant) {
        return Timestamp.from(instant);
    }
}
