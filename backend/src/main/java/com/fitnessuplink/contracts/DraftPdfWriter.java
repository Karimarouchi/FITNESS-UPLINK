package com.fitnessuplink.contracts;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/** Draws the preparatory contract PDF: wrapped text, accents kept, several pages when needed. */
public final class DraftPdfWriter {

    public static final String TEMPLATE_NOTICE =
            "Document préparatoire uniquement. Aucun modèle juridique n’a encore été validé par le métier / le juridique. "
                    + "Ce PDF ne constitue pas un contrat opposable.";

    /** A label / value line of a section (value is wrapped, label stays on the first line). */
    public record Row(String label, String value) {
    }

    /** A titled block made of rows and free paragraphs. */
    public record Section(String title, List<Row> rows, List<String> paragraphs) {
        public static Section rows(String title, List<Row> rows) {
            return new Section(title, rows, List.of());
        }

        public static Section text(String title, List<String> paragraphs) {
            return new Section(title, List.of(), paragraphs);
        }
    }

    private static final float MARGIN = 56;
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
    private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
    private static final float CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
    private static final float LABEL_WIDTH = 150;
    private static final Color NAVY = new Color(11, 26, 51);
    private static final Color GREY = new Color(91, 100, 114);
    private static final Color LINE = new Color(217, 221, 227);
    private static final Color LIME = new Color(212, 245, 60);

    private DraftPdfWriter() {
    }

    /** Backwards compatible entry point: a plain list of lines. */
    public static byte[] write(String title, List<String> lines) {
        return write(title, List.of(Section.text(null, lines == null ? List.of() : lines)), false);
    }

    public static byte[] write(String title, List<Section> sections, boolean signatureBlock) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Canvas canvas = new Canvas(document);
            canvas.header();
            canvas.title(title);
            canvas.notice(TEMPLATE_NOTICE);
            for (Section section : sections) {
                canvas.section(section);
            }
            if (signatureBlock) {
                canvas.signatures();
            }
            canvas.close();
            document.save(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to generate draft PDF", ex);
        }
    }

    private static final class Canvas {
        private final PDDocument document;
        private final PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        private final PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        private final PDType1Font italic = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);
        private PDPageContentStream stream;
        private float y;
        private int pages;

        Canvas(PDDocument document) throws IOException {
            this.document = document;
            newPage();
        }

        private void newPage() throws IOException {
            if (stream != null) {
                stream.close();
            }
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            stream = new PDPageContentStream(document, page);
            pages++;
            y = PAGE_HEIGHT - 48;
        }

        private void ensure(float height) throws IOException {
            if (y - height < 70) {
                newPage();
                y = PAGE_HEIGHT - 56;
            }
        }

        void header() throws IOException {
            stream.setNonStrokingColor(NAVY);
            stream.addRect(0, PAGE_HEIGHT - 30, PAGE_WIDTH, 30);
            stream.fill();
            stream.setNonStrokingColor(LIME);
            stream.addRect(0, PAGE_HEIGHT - 33, PAGE_WIDTH, 3);
            stream.fill();
            text("FITNESS UPLINK", MARGIN, PAGE_HEIGHT - 20, bold, 11, Color.WHITE);
            String right = "Projet de contrat";
            text(right, PAGE_WIDTH - MARGIN - width(right, regular, 9), PAGE_HEIGHT - 20, regular, 9, Color.WHITE);
            y = PAGE_HEIGHT - 62;
        }

        void title(String title) throws IOException {
            for (String line : wrap(title, bold, 17, CONTENT_WIDTH)) {
                ensure(24);
                text(line, MARGIN, y, bold, 17, NAVY);
                y -= 22;
            }
            y -= 4;
        }

        void notice(String note) throws IOException {
            List<String> lines = wrap(note, italic, 8.5f, CONTENT_WIDTH - 20);
            float height = lines.size() * 11.5f + 14;
            ensure(height);
            stream.setNonStrokingColor(new Color(244, 246, 249));
            stream.addRect(MARGIN, y - height + 6, CONTENT_WIDTH, height);
            stream.fill();
            stream.setNonStrokingColor(LIME);
            stream.addRect(MARGIN, y - height + 6, 3, height);
            stream.fill();
            float lineY = y - 6;
            for (String line : lines) {
                text(line, MARGIN + 12, lineY, italic, 8.5f, GREY);
                lineY -= 11.5f;
            }
            y -= height + 14;
        }

        void section(Section section) throws IOException {
            if (section.title() != null && !section.title().isBlank()) {
                ensure(40);
                y -= 6;
                text(section.title().toUpperCase(java.util.Locale.ROOT), MARGIN, y, bold, 10.5f, NAVY);
                y -= 5;
                stream.setStrokingColor(NAVY);
                stream.setLineWidth(1.2f);
                stream.moveTo(MARGIN, y);
                stream.lineTo(MARGIN + CONTENT_WIDTH, y);
                stream.stroke();
                y -= 16;
            }
            for (Row row : section.rows()) {
                if (row.value() == null || row.value().isBlank()) {
                    continue;
                }
                List<String> lines = wrap(row.value(), regular, 10, CONTENT_WIDTH - LABEL_WIDTH);
                ensure(lines.size() * 14 + 4);
                text(row.label(), MARGIN, y, bold, 9.5f, GREY);
                float lineY = y;
                for (String line : lines) {
                    text(line, MARGIN + LABEL_WIDTH, lineY, regular, 10, NAVY);
                    lineY -= 14;
                }
                y = lineY - 3;
            }
            for (String paragraph : section.paragraphs()) {
                if (paragraph == null || paragraph.isBlank()) {
                    y -= 8;
                    continue;
                }
                for (String line : wrap(paragraph, regular, 10, CONTENT_WIDTH)) {
                    ensure(14);
                    text(line, MARGIN, y, regular, 10, NAVY);
                    y -= 14;
                }
            }
            y -= 6;
        }

        void signatures() throws IOException {
            ensure(130);
            y -= 10;
            float half = CONTENT_WIDTH / 2 - 12;
            text("POUR L’EMPLOYEUR", MARGIN, y, bold, 9.5f, NAVY);
            text("LE CANDIDAT", MARGIN + half + 24, y, bold, 9.5f, NAVY);
            y -= 14;
            text("Nom, qualité, date et signature", MARGIN, y, italic, 8.5f, GREY);
            text("Nom, date et signature", MARGIN + half + 24, y, italic, 8.5f, GREY);
            y -= 70;
            stream.setStrokingColor(LINE);
            stream.setLineWidth(1f);
            stream.moveTo(MARGIN, y);
            stream.lineTo(MARGIN + half, y);
            stream.moveTo(MARGIN + half + 24, y);
            stream.lineTo(MARGIN + CONTENT_WIDTH, y);
            stream.stroke();
            y -= 16;
        }

        void close() throws IOException {
            stream.close();
            int total = document.getNumberOfPages();
            for (int index = 0; index < total; index++) {
                try (PDPageContentStream footer = new PDPageContentStream(
                        document, document.getPage(index), PDPageContentStream.AppendMode.APPEND, true)) {
                    String left = "Document préparatoire - non opposable";
                    String right = "Page " + (index + 1) + " / " + total;
                    footer.setStrokingColor(LINE);
                    footer.setLineWidth(0.8f);
                    footer.moveTo(MARGIN, 46);
                    footer.lineTo(PAGE_WIDTH - MARGIN, 46);
                    footer.stroke();
                    write(footer, left, MARGIN, 32, regular, 8, GREY);
                    write(footer, right, PAGE_WIDTH - MARGIN - width(right, regular, 8), 32, regular, 8, GREY);
                }
            }
        }

        private void text(String value, float x, float baseline, PDType1Font font, float size, Color color) throws IOException {
            write(stream, value, x, baseline, font, size, color);
        }

        private void write(PDPageContentStream target, String value, float x, float baseline, PDType1Font font, float size, Color color)
                throws IOException {
            target.beginText();
            target.setNonStrokingColor(color);
            target.setFont(font, size);
            target.newLineAtOffset(x, baseline);
            target.showText(encodable(value, font));
            target.endText();
        }

        private float width(String value, PDType1Font font, float size) throws IOException {
            return font.getStringWidth(encodable(value, font)) / 1000f * size;
        }

        /** Greedy word wrap; very long words are cut so nothing runs off the page. */
        private List<String> wrap(String value, PDType1Font font, float size, float maxWidth) throws IOException {
            List<String> lines = new ArrayList<>();
            String clean = encodable(value == null ? "" : value, font);
            for (String paragraph : clean.split("\\R", -1)) {
                StringBuilder current = new StringBuilder();
                for (String word : paragraph.split(" ")) {
                    String candidate = current.length() == 0 ? word : current + " " + word;
                    if (width(candidate, font, size) <= maxWidth) {
                        current = new StringBuilder(candidate);
                        continue;
                    }
                    if (current.length() > 0) {
                        lines.add(current.toString());
                        current = new StringBuilder();
                    }
                    String rest = word;
                    while (width(rest, font, size) > maxWidth && rest.length() > 1) {
                        int cut = rest.length() - 1;
                        while (cut > 1 && width(rest.substring(0, cut), font, size) > maxWidth) {
                            cut--;
                        }
                        lines.add(rest.substring(0, cut));
                        rest = rest.substring(cut);
                    }
                    current = new StringBuilder(rest);
                }
                lines.add(current.toString());
            }
            return lines;
        }

        /** Keeps accents, swaps typographic characters, and drops anything the font cannot draw. */
        private String encodable(String value, PDType1Font font) {
            if (value == null) {
                return "";
            }
            String text = value
                    .replace('’', '\'')
                    .replace('‘', '\'')
                    .replace('“', '"')
                    .replace('”', '"')
                    .replace("—", "-")
                    .replace("–", "-")
                    .replace("…", "...")
                    .replace(' ', ' ')
                    .replace('\t', ' ');
            StringBuilder out = new StringBuilder(text.length());
            for (int i = 0; i < text.length(); i++) {
                char ch = text.charAt(i);
                if (ch == '\n' || ch == '\r') {
                    out.append(ch);
                    continue;
                }
                try {
                    font.encode(String.valueOf(ch));
                    out.append(ch);
                } catch (IllegalArgumentException | IOException ex) {
                    out.append('?');
                }
            }
            return out.toString();
        }
    }
}
