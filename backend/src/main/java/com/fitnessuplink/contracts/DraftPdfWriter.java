package com.fitnessuplink.contracts;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;

public final class DraftPdfWriter {

    public static final String TEMPLATE_NOTICE =
            "Document préparatoire uniquement. Aucun modèle juridique n’a encore été validé par le métier / le juridique. "
                    + "Ce PDF ne constitue pas un contrat opposable.";

    private DraftPdfWriter() {
    }

    public static byte[] write(String title, List<String> lines) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDType1Font heading = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font body = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                float y = 800;
                stream.beginText();
                stream.setFont(heading, 14);
                stream.newLineAtOffset(50, y);
                stream.showText(safe("FITNESS UPLINK — Projet de contrat"));
                stream.endText();
                y -= 28;
                stream.beginText();
                stream.setFont(heading, 12);
                stream.newLineAtOffset(50, y);
                stream.showText(safe(title));
                stream.endText();
                y -= 24;
                stream.setFont(body, 10);
                for (String paragraph : wrap(lines, 95)) {
                    if (y < 60) {
                        break;
                    }
                    stream.beginText();
                    stream.newLineAtOffset(50, y);
                    stream.showText(safe(paragraph));
                    stream.endText();
                    y -= 14;
                }
            }
            document.save(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to generate draft PDF", ex);
        }
    }

    private static List<String> wrap(List<String> lines, int width) {
        List<String> wrapped = new ArrayList<>();
        wrapped.add(TEMPLATE_NOTICE);
        wrapped.add("");
        for (String line : lines) {
            if (line == null || line.isBlank()) {
                wrapped.add("");
                continue;
            }
            String remaining = safe(line);
            while (remaining.length() > width) {
                wrapped.add(remaining.substring(0, width));
                remaining = remaining.substring(width);
            }
            wrapped.add(remaining);
        }
        return wrapped;
    }

    private static String safe(String value) {
        if (value == null) {
            return "";
        }
        String ascii = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return ascii.replace("(", "[").replace(")", "]").replace("\\", "/");
    }
}
