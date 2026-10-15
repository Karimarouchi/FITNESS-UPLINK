package com.fitnessuplink.contracts;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.io.File;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class DraftPdfPreviewTest {

    @Test
    void rendersEmployerCandidateAndTerms() throws Exception {
        List<DraftPdfWriter.Section> sections = List.of(
                DraftPdfWriter.Section.rows("Entre l'employeur", List.of(
                        new DraftPdfWriter.Row("Raison sociale", "Antigone Consulting SARL"),
                        new DraftPdfWriter.Row("Matricule fiscal", "1234567/A/M/000"),
                        new DraftPdfWriter.Row("Registre de commerce", "B01234562020"),
                        new DraftPdfWriter.Row("Adresse", "12 rue de la République, Les Berges du Lac, Tunis"),
                        new DraftPdfWriter.Row("Représentant légal", "Rihem DRIDI - Gérante")
                )),
                DraftPdfWriter.Section.rows("Et le candidat", List.of(
                        new DraftPdfWriter.Row("Nom et prénom", "Malek Naouar"),
                        new DraftPdfWriter.Row("E-mail", "karimarouchi123@gmail.com")
                )),
                DraftPdfWriter.Section.rows("Objet du contrat", List.of(
                        new DraftPdfWriter.Row("Poste", "COCHE"),
                        new DraftPdfWriter.Row("Rémunération", "2444 TND"),
                        new DraftPdfWriter.Row("Informations complémentaires",
                                "Période d'essai de trois mois, horaires du lundi au samedi, " + "x".repeat(130))
                )),
                DraftPdfWriter.Section.text("Clauses juridiques", List.of("Les clauses ne sont pas générées. ’ — …"))
        );
        byte[] pdf = DraftPdfWriter.write("Contrat — Malek Naouar — COCHE", sections, true);
        File out = new File(System.getProperty("pdf.preview.dir", "target"), "contract-preview.png");
        try (PDDocument document = Loader.loadPDF(pdf)) {
            assertTrue(document.getNumberOfPages() >= 1);
            ImageIO.write(new PDFRenderer(document).renderImageWithDPI(0, 80), "png", out);
        }
        assertTrue(out.length() > 0);
    }
}
