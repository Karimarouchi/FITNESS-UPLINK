package com.fitnessuplink.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.admin.dto.VerificationAccountDto;
import com.fitnessuplink.admin.dto.VerificationCheckSummaryDto;
import com.fitnessuplink.admin.dto.VerificationDossierDto;
import com.fitnessuplink.admin.dto.VerificationFileDto;
import com.fitnessuplink.admin.dto.VerificationPersonDto;
import com.fitnessuplink.admin.dto.VerificationSectionDto;
import com.fitnessuplink.auth.mail.HireMailService;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.notifications.NotificationService;
import com.fitnessuplink.notifications.NotifyCategory;
import com.fitnessuplink.common.exception.ResourceNotFoundException;
import com.fitnessuplink.onboarding.UserProfileValue;
import com.fitnessuplink.onboarding.UserProfileValueRepository;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.UserService;
import com.fitnessuplink.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminVerificationService {

    private static final Set<String> STATUSES = Set.of("pending", "verified", "rejected");
    private static final Pattern UPLOAD_ID = Pattern.compile("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"");

    private static final Map<String, String> ESTABLISHMENT_TYPES = Map.of(
            "gym", "Salle de sport / Gym",
            "studio", "Studio",
            "academy", "Académie / École",
            "club", "Club / Employeur",
            "supplier", "Fournisseur",
            "service", "Prestataire de services",
            "events", "Organisateur d’événements",
            "creator", "Expert / Créateur",
            "other", "Autre"
    );

    private final UserRepository userRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final UserService userService;
    private final UserVerificationCheckRepository userVerificationCheckRepository;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;
    private final HireMailService hireMailService;

    @Transactional(readOnly = true)
    public List<VerificationAccountDto> list(String group, String status) {
        return userService.findReviewableUsers(group, status).stream()
                .map(user -> toAccount(user, valuesOf(user.getId()), reviewsOf(user.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public VerificationDossierDto dossier(UUID id) {
        User user = requireReviewable(id);
        Map<String, String> values = valuesOf(id);
        Map<String, String> reviews = reviewsOf(id);
        List<VerificationSectionDto> sections = sectionsOf(user, values, reviews);
        return new VerificationDossierDto(toAccount(user, sections), sections);
    }

    @Transactional
    public VerificationAccountDto update(UUID id, String status) {
        UserResponse updated = userService.updateVerification(id, status);
        User user = userRepository.findById(updated.id()).orElseThrow();
        return toAccount(user, valuesOf(user.getId()), reviewsOf(user.getId()));
    }

    @Transactional
    public VerificationDossierDto updateCheck(UUID id, String key, String status) {
        return updateCheck(id, key, status, null);
    }

    @Transactional
    public VerificationDossierDto updateCheck(UUID id, String key, String status, String reason) {
        if (!STATUSES.contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid verification status");
        }
        if ("rejected".equals(status) && (reason == null || reason.isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REJECTION_REASON_REQUIRED");
        }
        User user = requireReviewable(id);
        Map<String, String> values = valuesOf(id);
        Map<String, String> reviews = reviewsOf(id);
        List<VerificationSectionDto> current = sectionsOf(user, values, reviews);
        VerificationSectionDto section = current.stream()
                .filter(item -> item.key().equals(key))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Verification check not found"));
        if ("verified".equals(status) && !section.complete()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot verify an incomplete check");
        }

        UserVerificationCheck check = userVerificationCheckRepository
                .findById(new UserVerificationCheckId(id, key))
                .orElseGet(() -> {
                    UserVerificationCheck created = new UserVerificationCheck();
                    created.setUserId(id);
                    created.setCheckKey(key);
                    return created;
                });
        check.setStatus(status);
        check.setRejectionReason("rejected".equals(status) ? reason.trim() : null);
        userVerificationCheckRepository.save(check);

        reviews.put(key, status);
        List<VerificationSectionDto> sections = sectionsOf(user, values, reviews);
        String overall = overallStatus(sections);
        if (!overall.equals(user.getVerificationStatus())) {
            user.setVerificationStatus(overall);
            userRepository.save(user);
        }
        if ("rejected".equals(status)) {
            notificationService.notify(
                    user.getId(),
                    NotifyCategory.DOCUMENT,
                    "Document refusé : " + section.label(),
                    "Motif : " + reason.trim(),
                    "Ouvrir",
                    "/app/profile/edit"
            );
            hireMailService.enqueueDocumentRejected(user, section.label(), reason.trim());
        } else if ("verified".equals(status)) {
            notificationService.notify(
                    user.getId(),
                    NotifyCategory.DOCUMENT,
                    "Document validé : " + section.label(),
                    section.label() + " a été validé.",
                    "Ouvrir",
                    "/app/dashboard"
            );
            hireMailService.enqueueDocumentVerified(user, section.label());
        }
        return new VerificationDossierDto(toAccount(user, sections), sections);
    }

    private User requireReviewable(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.isSuperAdmin() || (!user.isCandidate() && !user.isBusiness())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "User not found");
        }
        return user;
    }

    private VerificationAccountDto toAccount(User user, Map<String, String> values, Map<String, String> reviews) {
        return toAccount(user, sectionsOf(user, values, reviews));
    }

    private VerificationAccountDto toAccount(User user, List<VerificationSectionDto> sections) {
        UserResponse base = userService.toResponse(user);
        return new VerificationAccountDto(
                base.id(),
                base.email(),
                base.firstName(),
                base.lastName(),
                base.displayName(),
                base.role(),
                base.country(),
                base.onboardingCompleted(),
                base.createdAt(),
                base.avatarUploadId(),
                base.verificationStatus(),
                user.isCandidate() ? "PROFESSIONAL" : "COMPANY",
                sections.stream()
                        .map(section -> new VerificationCheckSummaryDto(
                                section.key(),
                                section.label(),
                                section.complete(),
                                section.required(),
                                section.reviewStatus()
                        ))
                        .toList()
        );
    }

    private List<VerificationSectionDto> sectionsOf(User user, Map<String, String> values, Map<String, String> reviews) {
        Map<String, String> reasons = reasonsOf(user.getId());
        return user.isCandidate()
                ? professionalSections(user, values, reviews, reasons)
                : companySections(user, values, reviews, reasons);
    }

    private List<VerificationSectionDto> professionalSections(
            User user,
            Map<String, String> values,
            Map<String, String> reviews,
            Map<String, String> reasons
    ) {
        List<String> identityFacts = new ArrayList<>();
        addFact(identityFacts, "Nom", joinName(user.getFirstName(), user.getLastName()));
        addFact(identityFacts, "E-mail", user.getEmail());
        addFact(identityFacts, "Téléphone", text(values, "phone"));
        addFact(identityFacts, "Ville", text(values, "city"));
        if (user.getCountry() != null) {
            addFact(identityFacts, "Pays", user.getCountry().getName());
        }
        addFact(identityFacts, "Titre", text(values, "professional_title"));
        String documentType = text(values, "identity_document_type");
        if ("cin".equals(documentType)) {
            addFact(identityFacts, "Pièce", "CIN");
        } else if ("passport".equals(documentType)) {
            addFact(identityFacts, "Pièce", "Passeport");
        }
        addFact(identityFacts, "N° pièce", text(values, "identity_document_number"));
        List<VerificationFileDto> identityFiles = new ArrayList<>();
        identityFiles.addAll(files(values.get("professional_photo")));
        identityFiles.addAll(files(values.get("identity_document")));
        boolean identityOk = hasText(user.getFirstName())
                && hasText(user.getLastName())
                && hasText(text(values, "city"))
                && hasText(text(values, "phone"))
                && hasText(documentType)
                && hasText(text(values, "identity_document_number"))
                && !files(values.get("professional_photo")).isEmpty()
                && !files(values.get("identity_document")).isEmpty();

        List<VerificationFileDto> cv = files(values.get("cv"));
        List<VerificationFileDto> diplomas = files(values.get("diplomas"));
        List<VerificationFileDto> certifications = files(values.get("certifications"));

        return List.of(
                section(
                        "identity",
                        "Identité",
                        identityOk
                                ? "Photo, type de pièce, numéro et scan CIN/passeport du professionnel."
                                : "Photo, choix CIN ou passeport, numéro et scan de la pièce sont obligatoires. Le compte ne peut pas être vérifié sans la photo de la pièce.",
                        identityOk,
                        true,
                        reviews,
                        identityFacts,
                        identityFiles,
                        List.of(),
                        reasons
                ),
                section(
                        "cv",
                        "CV",
                        "À valider seulement si le candidat a transmis un CV.",
                        !cv.isEmpty(),
                        false,
                        reviews,
                        cv.isEmpty() ? List.of("Aucun CV transmis.") : List.of(cv.size() + " fichier(s)"),
                        cv,
                        List.of(),
                        reasons
                ),
                section(
                        "diplomas",
                        "Diplômes",
                        "À valider seulement si le candidat a transmis des justificatifs.",
                        !diplomas.isEmpty(),
                        false,
                        reviews,
                        diplomas.isEmpty() ? List.of("Aucun diplôme transmis.") : List.of(diplomas.size() + " fichier(s)"),
                        diplomas,
                        List.of(),
                        reasons
                ),
                section(
                        "certifications",
                        "Certifications",
                        "À valider seulement si le candidat a transmis des certifications.",
                        !certifications.isEmpty(),
                        false,
                        reviews,
                        certifications.isEmpty() ? List.of("Aucune certification transmise.") : List.of(certifications.size() + " fichier(s)"),
                        certifications,
                        List.of(),
                        reasons
                )
        );
    }

    private List<VerificationSectionDto> companySections(
            User user,
            Map<String, String> values,
            Map<String, String> reviews,
            Map<String, String> reasons
    ) {
        List<String> existenceFacts = new ArrayList<>();
        addFact(existenceFacts, "Nom commercial", text(values, "trade_name"));
        addFact(existenceFacts, "Raison sociale", text(values, "legal_name"));
        addFact(existenceFacts, "Type", labelOf(text(values, "establishment_type")));
        addFact(existenceFacts, "Ville", text(values, "org_city"));
        addFact(existenceFacts, "Adresse", text(values, "org_address"));
        addFact(existenceFacts, "Patente", text(values, "patente_number"));
        addFact(existenceFacts, "Registre de commerce", text(values, "trade_register_number"));
        addFact(existenceFacts, "Matricule fiscal", text(values, "tax_id"));
        boolean existenceOk = hasText(text(values, "legal_name"))
                && (hasText(text(values, "patente_number"))
                || hasText(text(values, "trade_register_number"))
                || hasText(text(values, "tax_id")));

        List<VerificationFileDto> legalFiles = new ArrayList<>();
        legalFiles.addAll(files(values.get("patente_document")));
        legalFiles.addAll(files(values.get("trade_register_document")));
        legalFiles.addAll(files(values.get("tax_id_document")));
        legalFiles.addAll(files(values.get("legal_documents")));
        List<String> legalFacts = new ArrayList<>();
        if (files(values.get("patente_document")).isEmpty()) {
            legalFacts.add("Justificatif de patente : non fourni");
        } else {
            legalFacts.add("Justificatif de patente : fourni");
        }
        if (files(values.get("trade_register_document")).isEmpty()) {
            legalFacts.add("Extrait RC / RNE : non fourni");
        } else {
            legalFacts.add("Extrait RC / RNE : fourni");
        }
        if (files(values.get("tax_id_document")).isEmpty()) {
            legalFacts.add("Justificatif fiscal : non fourni");
        } else {
            legalFacts.add("Justificatif fiscal : fourni");
        }
        if (files(values.get("legal_documents")).isEmpty()) {
            legalFacts.add("Autres documents juridiques : non fournis");
        } else {
            legalFacts.add("Autres documents juridiques : " + files(values.get("legal_documents")).size() + " fichier(s)");
        }

        List<VerificationPersonDto> people = legalRepresentatives(user, values);
        List<String> peopleFacts = new ArrayList<>();
        if (people.isEmpty()) {
            peopleFacts.add("Aucun représentant légal renseigné.");
        } else {
            for (VerificationPersonDto person : people) {
                peopleFacts.add(person.name() + (hasText(person.title()) ? " · " + person.title() : ""));
            }
        }
        if (people.stream().noneMatch(person -> hasText(person.idNumber()))) {
            addFact(peopleFacts, "CIN / n° pièce", text(values, "representative_cin"));
        }

        return List.of(
                section(
                        "existence",
                        "Existence de l’entreprise",
                        "Validez ce contrôle indépendamment des documents et du représentant.",
                        existenceOk,
                        true,
                        reviews,
                        existenceFacts.isEmpty() ? List.of("Aucune information d’existence transmise.") : existenceFacts,
                        List.of(),
                        List.of(),
                        reasons
                ),
                section(
                        "legal_documents",
                        "Documents légaux",
                        "Validez ce contrôle indépendamment de l’existence et du représentant.",
                        !legalFiles.isEmpty(),
                        true,
                        reviews,
                        legalFacts,
                        legalFiles,
                        List.of(),
                        reasons
                ),
                section(
                        "legal_representative",
                        "Représentant légal",
                        "Validez ce contrôle indépendamment de l’existence et des documents.",
                        !people.isEmpty() && people.stream().anyMatch(person -> hasText(person.name())),
                        true,
                        reviews,
                        peopleFacts,
                        List.of(),
                        people,
                        reasons
                )
        );
    }

    private VerificationSectionDto section(
            String key,
            String label,
            String hint,
            boolean complete,
            boolean required,
            Map<String, String> reviews,
            List<String> facts,
            List<VerificationFileDto> files,
            List<VerificationPersonDto> people
    ) {
        return section(key, label, hint, complete, required, reviews, facts, files, people, Map.of());
    }

    private VerificationSectionDto section(
            String key,
            String label,
            String hint,
            boolean complete,
            boolean required,
            Map<String, String> reviews,
            List<String> facts,
            List<VerificationFileDto> files,
            List<VerificationPersonDto> people,
            Map<String, String> reasons
    ) {
        return new VerificationSectionDto(
                key,
                label,
                hint,
                complete,
                required,
                reviews.getOrDefault(key, "pending"),
                reasons.get(key),
                facts,
                files,
                people
        );
    }

    private Map<String, String> reasonsOf(UUID userId) {
        Map<String, String> reasons = new HashMap<>();
        for (UserVerificationCheck check : userVerificationCheckRepository.findByUserId(userId)) {
            if (check.getRejectionReason() != null && !check.getRejectionReason().isBlank()) {
                reasons.put(check.getCheckKey(), check.getRejectionReason());
            }
        }
        return reasons;
    }

    private String overallStatus(List<VerificationSectionDto> sections) {
        List<VerificationSectionDto> needed = sections.stream()
                .filter(section -> section.required() || section.complete())
                .toList();
        if (needed.stream().anyMatch(section -> "rejected".equals(section.reviewStatus()))) {
            return "rejected";
        }
        if (!needed.isEmpty() && needed.stream().allMatch(section -> "verified".equals(section.reviewStatus()))) {
            return "verified";
        }
        return "pending";
    }

    private Map<String, String> reviewsOf(UUID userId) {
        Map<String, String> reviews = new HashMap<>();
        for (UserVerificationCheck check : userVerificationCheckRepository.findByUserId(userId)) {
            reviews.put(check.getCheckKey(), check.getStatus());
        }
        return reviews;
    }

    private List<VerificationPersonDto> legalRepresentatives(User user, Map<String, String> values) {
        List<VerificationPersonDto> people = people(values.get("legal_representative"));
        if (!people.isEmpty()) {
            return people;
        }
        String name = joinName(user.getFirstName(), user.getLastName());
        String cin = text(values, "representative_cin");
        if (!hasText(name) && !hasText(cin)) {
            return List.of();
        }
        return List.of(new VerificationPersonDto(
                hasText(name) ? name : "Représentant déclaré",
                "Personne du compte",
                cin,
                firstNonBlank(text(values, "org_email"), user.getEmail()),
                text(values, "org_phone")
        ));
    }

    private List<VerificationPersonDto> people(String json) {
        JsonNode node = tree(json);
        if (node != null && node.isTextual()) {
            node = tree(node.asText());
        }
        if (node == null) {
            return List.of();
        }
        List<JsonNode> rows = new ArrayList<>();
        if (node.isArray()) {
            node.forEach(rows::add);
        } else if (node.isObject()) {
            rows.add(node);
        } else {
            return List.of();
        }
        List<VerificationPersonDto> items = new ArrayList<>();
        for (JsonNode item : rows) {
            if (item == null || !item.isObject()) {
                continue;
            }
            String name = firstTextNode(item, "name", "nom", "fullName", "full_name");
            if (!hasText(name)) {
                name = joinName(
                        firstTextNode(item, "first_name", "firstName", "prenom"),
                        firstTextNode(item, "last_name", "lastName")
                );
            }
            if (!hasText(name)) {
                continue;
            }
            items.add(new VerificationPersonDto(
                    name,
                    firstTextNode(item, "title", "fonction", "role"),
                    firstTextNode(item, "id_number", "idNumber", "cin", "representative_cin"),
                    firstTextNode(item, "email"),
                    firstTextNode(item, "phone", "telephone")
            ));
        }
        return items;
    }

    private List<VerificationFileDto> files(String json) {
        JsonNode node = tree(json);
        List<VerificationFileDto> items = new ArrayList<>();
        if (node != null) {
            JsonNode array = node.isArray() ? node : objectMapper.createArrayNode().add(node);
            for (JsonNode item : array) {
                if (item == null || !item.has("id")) {
                    continue;
                }
                try {
                    items.add(new VerificationFileDto(
                            UUID.fromString(item.path("id").asText()),
                            item.path("name").asText(item.path("originalFilename").asText("")),
                            item.path("contentType").asText(""),
                            item.path("size").asLong(item.path("sizeBytes").asLong(0))
                    ));
                } catch (IllegalArgumentException ignored) {
                    // skip malformed upload refs
                }
            }
        }
        if (items.isEmpty() && json != null) {
            Matcher matcher = UPLOAD_ID.matcher(json);
            if (matcher.find()) {
                try {
                    items.add(new VerificationFileDto(
                            UUID.fromString(matcher.group(1)),
                            "Document",
                            "",
                            0
                    ));
                } catch (IllegalArgumentException ignored) {
                    // skip malformed upload refs
                }
            }
        }
        return items;
    }

    private Map<String, String> valuesOf(UUID userId) {
        return userProfileValueRepository.findByUserId(userId).stream()
                .filter(item -> item.getValue() != null)
                .collect(Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (left, right) -> left));
    }

    private JsonNode tree(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(json);
        } catch (Exception ex) {
            return null;
        }
    }

    private void addFact(List<String> facts, String label, String value) {
        if (hasText(value)) {
            facts.add(label + " : " + value);
        }
    }

    private String text(Map<String, String> values, String key) {
        String value = values.get(key);
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String textNode(JsonNode node, String field) {
        String value = node.path(field).asText("");
        return value.isBlank() ? null : value;
    }

    private String firstTextNode(JsonNode node, String... fields) {
        for (String field : fields) {
            String value = textNode(node, field);
            if (hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String labelOf(String type) {
        if (!hasText(type)) {
            return null;
        }
        return ESTABLISHMENT_TYPES.getOrDefault(type, type);
    }

    private String joinName(String first, String last) {
        return ((first == null ? "" : first) + " " + (last == null ? "" : last)).trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
