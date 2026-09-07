package com.fitnessuplink.onboarding.cv;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.catalog.RoleProfileFieldRepository;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.UploadService;
import com.fitnessuplink.onboarding.UserUpload;
import com.fitnessuplink.onboarding.dto.ParseCvResponse;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CvImportService {

    private static final Set<String> SKIP_KEYS = Set.of("cv", "professional_photo", "diplomas", "certifications", "presentation_videos");

    private final UserRepository userRepository;
    private final RoleProfileFieldRepository roleProfileFieldRepository;
    private final UploadService uploadService;
    private final CvTextExtractor textExtractor;
    private final ObjectMapper objectMapper;
    private final CvProfileParser parser = new CvProfileParser();

    @Transactional(readOnly = true)
    public ParseCvResponse parse(UUID userId, UUID uploadId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getAppRole() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choisissez un rôle d’abord");
        }
        Set<String> allowed = roleProfileFieldRepository.findByRole_IdOrderBySortOrderAsc(user.getAppRole().getId()).stream()
                .map(item -> item.getField().getFieldKey())
                .collect(Collectors.toSet());
        if (!allowed.contains("cv")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "L’import de CV est réservé aux candidats.");
        }

        UploadService.LoadedUpload loaded = uploadService.load(userId, uploadId);
        UserUpload upload = loaded.upload();
        if (!"cv".equals(upload.getFieldKey())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Envoyez d’abord un CV.");
        }

        String text = textExtractor.extract(uploadService.readBytes(upload.getId()), upload.getContentType(), upload.getOriginalFilename());
        if (text == null || text.length() < 40) {
            return new ParseCvResponse(
                    Map.of(),
                    List.of(),
                    "Impossible de lire le texte de ce CV. Utilisez un PDF texte ou un DOCX, puis vérifiez le formulaire."
            );
        }

        ExtractedCv extracted = parser.parse(text, upload.getOriginalFilename());
        Map<String, String> values = toValues(extracted);
        values.keySet().removeIf(key -> !allowed.contains(key) || SKIP_KEYS.contains(key));
        List<String> filled = new ArrayList<>(values.keySet());
        if (filled.isEmpty()) {
            return new ParseCvResponse(
                    Map.of(),
                    List.of(),
                    "Peu d’informations ont pu être lues. Le CV est enregistré : complétez le formulaire à la main."
            );
        }
        return new ParseCvResponse(
                values,
                filled,
                filled.size() == 1
                        ? "1 champ a été prérempli depuis le CV. Vérifiez-le avant de continuer."
                        : filled.size() + " champs ont été préremplis depuis le CV. Vérifiez-les avant de continuer."
        );
    }

    private Map<String, String> toValues(ExtractedCv extracted) {
        Map<String, String> values = new LinkedHashMap<>();
        put(values, "first_name", extracted.firstName());
        put(values, "last_name", extracted.lastName());
        put(values, "phone", extracted.phone());
        put(values, "city", extracted.city());
        put(values, "professional_title", extracted.professionalTitle());
        put(values, "biography", extracted.biography());
        putJson(values, "specialties", extracted.specialties());
        putJson(values, "skills", extracted.skills());
        putJson(values, "experiences", extracted.experiences());
        putJson(values, "spoken_languages", extracted.languages());
        putJson(values, "contract_types", extracted.contractTypes());
        put(values, "availability", extracted.availability());
        if (extracted.salaryAmount() != null) {
            values.put("desired_salary", json(Map.of(
                    "amount", extracted.salaryAmount(),
                    "currency", extracted.salaryCurrency() == null ? "TND" : extracted.salaryCurrency()
            )));
        }
        return values;
    }

    private void put(Map<String, String> values, String key, String value) {
        if (value != null && !value.isBlank()) {
            values.put(key, value);
        }
    }

    private void putJson(Map<String, String> values, String key, List<?> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        values.put(key, json(items));
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d’analyser le CV");
        }
    }
}
