package com.fitnessuplink.onboarding.cv;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CvProfileParserTest {

    private final CvProfileParser parser = new CvProfileParser();

    @Test
    void extractsIdentitySkillsAndExperienceFromFrenchCv() {
        ExtractedCv cv = parser.parse("""
                Karim Arouchi
                Coach sportif
                Téléphone : +216 53 345 912
                Ville : Ezzahra
                E-mail : karim@example.com

                Profil
                Coach sportif passionné, spécialisé en musculation et nutrition.

                Expérience
                Coach sportif, Fitness Park Tunis
                Janvier 2022 - Juin 2024
                Préparateur physique, Club espoir
                2020 - 2022

                Compétences
                Musculation, HIIT, Yoga, Coaching collectif

                Langues
                Français : courant
                Anglais : B2
                Arabe : langue maternelle

                Salaire souhaité : 2500 TND
                Disponible immédiatement
                CDI ou freelance
                """);

        assertEquals("Karim", cv.firstName());
        assertEquals("Arouchi", cv.lastName());
        assertEquals("53345912", cv.phone());
        assertEquals("Ezzahra", cv.city());
        assertEquals("Coach sportif", cv.professionalTitle());
        assertTrue(cv.biography().toLowerCase().contains("musculation"));
        assertTrue(cv.specialties().contains("musculation"));
        assertTrue(cv.specialties().contains("hiit"));
        assertTrue(cv.specialties().contains("yoga"));
        assertTrue(cv.skills().contains("Coaching collectif"));
        assertFalse(cv.experiences().isEmpty());
        Map<String, String> firstJob = cv.experiences().getFirst();
        assertEquals("Coach sportif", firstJob.get("title"));
        assertEquals("Fitness Park Tunis", firstJob.get("company"));
        assertEquals("2022-01", firstJob.get("start"));
        assertEquals("2024-06", firstJob.get("end"));
        assertEquals("c1", cv.languages().getFirst().get("level"));
        assertEquals("native", cv.languages().get(2).get("level"));
        assertEquals("2500", cv.salaryAmount());
        assertEquals("TND", cv.salaryCurrency());
        assertTrue(cv.contractTypes().contains("cdi"));
        assertEquals("immediate", cv.availability());
    }

    @Test
    void ignoresTinyOrEmptyText() {
        assertFalse(parser.parse("cv").hasAnything());
    }

    @Test
    void readsDesignerCvWithSpacedHeadingsAndInternationalPhone() {
        ExtractedCv cv = parser.parse(
                """
                +216 56 321 429 antigoneconsulting.info@gmail.com
                C O M P É T E N C E S
                Pilotage d’agence
                MALEK NAOUAR C E O & C O - F O U N D E R | M A R K E T I N G
                P R O F I L
                CEO & Co-Founder de Antigone Creative Agency une agence de marketing basée à Tunis et à Paris depuis plus de 5 ans.
                E X P É R I E N C E S P R O F E S S I O N N E L L E S
                C E O & C O - F O U N D E R — A N T I G O N E
                T U N I S & P A R I S | 2 0 2 1 – A U J O U R D ’ H U I
                L A N G U E S
                • F R A N Ç A I S
                • A N G L A I S
                • A R A B E
                """,
                "CV MALEK NAOUAR.pdf"
        );
        assertEquals("Malek", cv.firstName());
        assertEquals("Naouar", cv.lastName());
        assertEquals("56321429", cv.phone());
        assertEquals("Tunis", cv.city());
        assertTrue(cv.professionalTitle() != null && cv.professionalTitle().toUpperCase().contains("CEO"));
        assertTrue(cv.biography() != null && cv.biography().toLowerCase().contains("antigone"));
        assertFalse(cv.languages().isEmpty());
    }

    @Test
    void extractsIdentityFromRealMalekPdf() throws Exception {
        try (var in = CvProfileParserTest.class.getResourceAsStream("/cv/malek-naouar.pdf")) {
            assertTrue(in != null);
            byte[] bytes = in.readAllBytes();
            String text = new CvTextExtractor().extract(bytes, "application/pdf", "CV MALEK NAOUAR.pdf");
            ExtractedCv cv = parser.parse(text, "CV MALEK NAOUAR.pdf");
            assertEquals("Malek", cv.firstName());
            assertEquals("Naouar", cv.lastName());
            assertEquals("56321429", cv.phone());
            assertTrue(cv.hasAnything());
        }
    }
}
