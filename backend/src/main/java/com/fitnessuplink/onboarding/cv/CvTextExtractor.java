package com.fitnessuplink.onboarding.cv;

import com.fitnessuplink.common.exception.ApiException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
public class CvTextExtractor {

    public String extract(byte[] bytes, String contentType, String filename) {
        String type = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        String name = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (type.contains("pdf") || name.endsWith(".pdf") || isPdf(bytes)) {
            return fromPdf(bytes);
        }
        if (type.contains("wordprocessingml") || name.endsWith(".docx") || isZip(bytes)) {
            return fromDocx(bytes);
        }
        if (type.contains("msword") || name.endsWith(".doc")) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Enregistrez le CV en PDF ou DOCX pour l’analyse automatique."
            );
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "Format de CV non pris en charge. Utilisez un PDF ou un DOCX.");
    }

    private String fromPdf(byte[] bytes) {
        String positional = normalize(extractPdf(bytes, true));
        String stream = normalize(extractPdf(bytes, false));
        return CvTextNormalizer.identityScore(stream) > CvTextNormalizer.identityScore(positional)
                ? stream
                : positional;
    }

    private String extractPdf(byte[] bytes, boolean sortByPosition) {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(sortByPosition);
            return stripper.getText(document);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Impossible de lire ce PDF.");
        }
    }

    private String fromDocx(byte[] bytes) {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    String xml = new String(zip.readAllBytes(), StandardCharsets.UTF_8);
                    String text = xml
                            .replaceAll("</w:p>", "\n")
                            .replaceAll("<w:tab[^/]*/>", " ")
                            .replaceAll("<[^>]+>", " ");
                    return normalize(decodeXml(text));
                }
            }
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Impossible de lire ce document Word.");
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "Impossible de lire ce document Word.");
    }

    private static boolean isPdf(byte[] bytes) {
        return bytes != null && bytes.length >= 4
                && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F';
    }

    private static boolean isZip(byte[] bytes) {
        return bytes != null && bytes.length >= 2 && bytes[0] == 'P' && bytes[1] == 'K';
    }

    private static String decodeXml(String value) {
        return value
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&apos;", "'")
                .replace("&#39;", "'");
    }

    static String normalize(String text) {
        return CvTextNormalizer.normalize(text);
    }
}
