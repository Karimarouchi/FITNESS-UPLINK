package com.fitnessuplink.onboarding;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.catalog.AppRole;
import com.fitnessuplink.catalog.AppRoleRepository;
import com.fitnessuplink.catalog.Country;
import com.fitnessuplink.catalog.CountryRepository;
import com.fitnessuplink.catalog.ProfileField;
import com.fitnessuplink.catalog.RoleProfileField;
import com.fitnessuplink.catalog.RoleProfileFieldRepository;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.dto.CompleteProfileRequest;
import com.fitnessuplink.onboarding.dto.ItemField;
import com.fitnessuplink.onboarding.dto.ProfileFieldResponse;
import com.fitnessuplink.onboarding.dto.ProfileValuesResponse;
import com.fitnessuplink.onboarding.dto.SelectCountryRequest;
import com.fitnessuplink.onboarding.dto.SelectOption;
import com.fitnessuplink.onboarding.dto.SelectRoleRequest;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import com.fitnessuplink.user.UserService;
import com.fitnessuplink.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OnboardingService {

    private static final Pattern CONTROL_EXCEPT_NEWLINE = Pattern.compile("[\\p{Cntrl}&&[^\n\r]]");
    private static final Pattern PERSON_NAME = Pattern.compile("^\\p{L}[\\p{L} .'\\-]{0,79}$");
    private static final Pattern PHONE = Pattern.compile("^[+0-9() .\\-]{6,32}$");
    private static final Pattern CITY = Pattern.compile("^[\\p{L}0-9 .,'\\-]{2,80}$");
    private static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Set<String> NAME_KEYS = Set.of("first_name", "last_name");
    private static final String VERIFICATION_STATUS = "verification_status";

    private final UserRepository userRepository;
    private final AppRoleRepository appRoleRepository;
    private final CountryRepository countryRepository;
    private final RoleProfileFieldRepository roleProfileFieldRepository;
    private final UserProfileValueRepository userProfileValueRepository;
    private final UserService userService;
    private final ObjectMapper objectMapper;
    private final UploadService uploadService;

    @Transactional
    public UserResponse selectRole(UUID userId, SelectRoleRequest request) {
        User user = requireOnboardingUser(userId);
        AppRole role = appRoleRepository.findById(request.roleId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown role"));
        if (!role.isSelectable()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This role cannot be selected");
        }
        boolean roleChanged = user.getAppRole() == null || !user.getAppRole().getId().equals(role.getId());
        user.setAppRole(role);
        if (roleChanged) {
            userProfileValueRepository.deleteByUserId(user.getId());
        }
        userRepository.save(user);
        return userService.toResponse(user);
    }

    @Transactional
    public UserResponse selectCountry(UUID userId, SelectCountryRequest request) {
        User user = requireOnboardingUser(userId);
        if (user.getAppRole() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a role first");
        }
        Country country = countryRepository.findById(request.countryId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown country"));
        user.setCountry(country);
        userRepository.save(user);
        return userService.toResponse(user);
    }

    @Transactional(readOnly = true)
    public List<ProfileFieldResponse> profileFields(UUID userId) {
        User user = requireProfileUser(userId);
        return schemaFor(user.getAppRole().getId());
    }

    @Transactional(readOnly = true)
    public ProfileValuesResponse profileValues(UUID userId) {
        requireProfileUser(userId);
        Map<String, String> values = userProfileValueRepository.findByUserId(userId).stream()
                .filter(item -> item.getValue() != null)
                .collect(Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (left, right) -> left));
        return new ProfileValuesResponse(values);
    }

    @Transactional
    public UserResponse completeProfile(UUID userId, CompleteProfileRequest request) {
        User user = requireProfileUser(userId);
        if (user.getCountry() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a country first");
        }

        List<RoleProfileField> schema = roleProfileFieldRepository.findByRole_IdOrderBySortOrderAsc(user.getAppRole().getId());
        Set<String> allowedKeys = schema.stream()
                .map(item -> item.getField().getFieldKey())
                .collect(Collectors.toSet());
        Map<String, String> incoming = new HashMap<>(request.values() == null ? Map.of() : request.values());
        incoming.keySet().removeIf(key -> !allowedKeys.contains(key));

        Map<String, String> existing = userProfileValueRepository.findByUserId(user.getId()).stream()
                .filter(item -> item.getValue() != null)
                .collect(Collectors.toMap(UserProfileValue::getFieldKey, UserProfileValue::getValue, (left, right) -> left));

        List<UserProfileValue> stored = new ArrayList<>();
        for (RoleProfileField mapping : schema) {
            ProfileField field = mapping.getField();
            boolean required = mapping.getRequiredOverride() != null
                    ? mapping.getRequiredOverride()
                    : field.isRequired();
            String value;
            if (VERIFICATION_STATUS.equals(field.getFieldKey())) {
                String previous = existing.get(VERIFICATION_STATUS);
                value = previous == null || previous.isBlank() ? "pending" : previous;
            } else {
                value = sanitize(incoming.get(field.getFieldKey()));
            }
            if (value == null || value.isBlank()) {
                if (required) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, field.getLabel() + " is required");
                }
                continue;
            }
            validateValue(user.getId(), field, value);
            stored.add(new UserProfileValue(user.getId(), field.getFieldKey(), value));
            applyIdentity(user, field.getFieldKey(), value);
        }

        userProfileValueRepository.deleteByUserId(user.getId());
        userProfileValueRepository.saveAll(stored);
        user.setOnboardingCompleted(true);
        userRepository.save(user);
        return userService.toResponse(user);
    }

    private List<ProfileFieldResponse> schemaFor(UUID roleId) {
        return roleProfileFieldRepository.findByRole_IdOrderBySortOrderAsc(roleId).stream()
                .map(this::toFieldResponse)
                .toList();
    }

    private ProfileFieldResponse toFieldResponse(RoleProfileField mapping) {
        ProfileField field = mapping.getField();
        boolean required = mapping.getRequiredOverride() != null
                ? mapping.getRequiredOverride()
                : field.isRequired();
        FieldMeta meta = parseMeta(field.getOptionsJson());
        return new ProfileFieldResponse(
                field.getFieldKey(),
                field.getLabel(),
                field.getFieldType(),
                field.getPlaceholder(),
                meta.options(),
                meta.itemFields(),
                required,
                field.getMaxLength(),
                mapping.getSortOrder(),
                field.getSectionKey(),
                field.getSectionLabel(),
                field.getSectionIcon(),
                field.getHelpText(),
                field.getAccept()
        );
    }

    private FieldMeta parseMeta(String json) {
        if (json == null || json.isBlank()) {
            return new FieldMeta(List.of(), List.of());
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node.isArray()) {
                return new FieldMeta(objectMapper.convertValue(node, new TypeReference<List<SelectOption>>() {
                }), List.of());
            }
            if (node.has("items")) {
                List<ItemField> items = new ArrayList<>();
                for (JsonNode item : node.get("items")) {
                    List<SelectOption> options = item.has("options")
                            ? objectMapper.convertValue(item.get("options"), new TypeReference<List<SelectOption>>() {
                    })
                            : List.of();
                    items.add(new ItemField(
                            text(item, "key"),
                            text(item, "label"),
                            item.path("type").asText("text"),
                            item.path("required").asBoolean(false),
                            options
                    ));
                }
                return new FieldMeta(List.of(), items);
            }
        } catch (Exception ignored) {
            return new FieldMeta(List.of(), List.of());
        }
        return new FieldMeta(List.of(), List.of());
    }

    private String text(JsonNode node, String field) {
        return node.path(field).asText("");
    }

    private void validateValue(UUID userId, ProfileField field, String value) {
        Integer max = field.getMaxLength();
        String type = field.getFieldType() == null ? "TEXT" : field.getFieldType().toUpperCase(Locale.ROOT);
        boolean jsonType = Set.of("TAGS", "MULTISELECT", "REPEATABLE", "MONEY", "PHOTO", "FILE", "FILES", "COUNTRY_MULTI").contains(type);
        if (max != null && !jsonType && value.length() > max) {
            throw new ApiException(HttpStatus.BAD_REQUEST, field.getLabel() + " is too long");
        }
        switch (type) {
            case "TEXT" -> {
                if (NAME_KEYS.contains(field.getFieldKey()) && !PERSON_NAME.matcher(value).matches()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, field.getLabel() + " contains invalid characters");
                }
            }
            case "CITY" -> {
                if (!CITY.matcher(value).matches()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid city");
                }
            }
            case "TEL" -> {
                String digits = value.replaceAll("\\D", "");
                if (digits.length() < 6 || digits.length() > 15 || !PHONE.matcher(value).matches()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid phone number");
                }
            }
            case "EMAIL" -> {
                if (!EMAIL.matcher(value).matches()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid email address");
                }
            }
            case "URL" -> validateUrl(field.getLabel(), value);
            case "DATE" -> validateDate(field.getLabel(), value);
            case "SELECT", "BOOLEAN" -> validateSelect(field, value);
            case "COUNTRY" -> validateCountry(value);
            case "COUNTRY_MULTI" -> validateCountryMulti(value);
            case "MULTISELECT" -> validateMultiSelect(field, value);
            case "TAGS" -> validateTags(field, value);
            case "MONEY" -> validateMoney(field, value);
            case "REPEATABLE" -> validateRepeatable(field, value);
            case "PHOTO", "FILE" -> validateUploads(userId, field, value, 1);
            case "FILES" -> validateUploads(userId, field, value, 8);
            case "TEXTAREA" -> {
                if (CONTROL_EXCEPT_NEWLINE.matcher(value).find()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, field.getLabel() + " contains invalid characters");
                }
            }
            default -> {
            }
        }
    }

    private void validateUrl(String label, String value) {
        String trimmed = value.trim();
        String candidate = trimmed.matches("(?i)^https?://.+") ? trimmed : "https://" + trimmed;
        try {
            URI uri = URI.create(candidate);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null || host.isBlank() || !host.contains(".")) {
                throw new IllegalArgumentException("host");
            }
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                throw new IllegalArgumentException("scheme");
            }
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid website");
        }
    }

    private void validateCountry(String value) {
        try {
            UUID id = UUID.fromString(value);
            if (!countryRepository.existsById(id)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown country");
            }
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown country");
        }
    }

    private void validateCountryMulti(String value) {
        List<String> ids = readStringList(value);
        if (ids.size() > 12) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Too many countries");
        }
        for (String id : ids) {
            validateCountry(id);
        }
    }

    private void validateMultiSelect(ProfileField field, String value) {
        List<String> selected = readStringList(value);
        Set<String> allowed = parseMeta(field.getOptionsJson()).options().stream()
                .map(SelectOption::value)
                .collect(Collectors.toSet());
        for (String item : selected) {
            if (!allowed.contains(item)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid value for " + field.getLabel());
            }
        }
    }

    private void validateTags(ProfileField field, String value) {
        List<String> tags = readStringList(value);
        if (tags.size() > 20) {
            throw new ApiException(HttpStatus.BAD_REQUEST, field.getLabel() + " has too many items");
        }
        int max = field.getMaxLength() == null ? 60 : field.getMaxLength();
        for (String tag : tags) {
            if (tag.isBlank() || tag.length() > max) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid value for " + field.getLabel());
            }
        }
    }

    private void validateMoney(ProfileField field, String value) {
        try {
            JsonNode node = objectMapper.readTree(value);
            String amount = node.path("amount").asText("");
            String currency = node.path("currency").asText("");
            if (!amount.matches("\\d{1,9}([.,]\\d{1,2})?")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid salary");
            }
            boolean allowed = parseMeta(field.getOptionsJson()).options().stream()
                    .anyMatch(option -> option.value().equals(currency));
            if (!allowed) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid currency");
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid salary");
        }
    }

    private void validateRepeatable(ProfileField field, String value) {
        try {
            JsonNode array = objectMapper.readTree(value);
            if (!array.isArray() || array.size() > 15) {
                throw new ApiException(HttpStatus.BAD_REQUEST, field.getLabel() + " is invalid");
            }
            List<ItemField> schema = parseMeta(field.getOptionsJson()).itemFields();
            for (JsonNode item : array) {
                for (ItemField spec : schema) {
                    String raw = item.path(spec.key()).asText("").trim();
                    if (spec.required() && raw.isBlank()) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, spec.label() + " is required");
                    }
                    if (raw.length() > 400 && !"textarea".equals(spec.type())) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, spec.label() + " is too long");
                    }
                }
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, field.getLabel() + " is invalid");
        }
    }

    private void validateUploads(UUID userId, ProfileField field, String value, int maxFiles) {
        try {
            JsonNode node = objectMapper.readTree(value);
            JsonNode array = node.isArray() ? node : objectMapper.createArrayNode().add(node);
            if (array.size() > maxFiles) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Too many files for " + field.getLabel());
            }
            for (JsonNode item : array) {
                UUID id = UUID.fromString(item.path("id").asText());
                if (!uploadService.belongsTo(userId, id, field.getFieldKey())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid file for " + field.getLabel());
                }
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid file for " + field.getLabel());
        }
    }

    private List<String> readStringList(String value) {
        try {
            List<String> items = objectMapper.readValue(value, new TypeReference<List<String>>() {
            });
            return items.stream().map(String::trim).filter(item -> !item.isBlank()).toList();
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid list");
        }
    }

    private void validateDate(String label, String value) {
        try {
            LocalDate date = LocalDate.parse(value);
            LocalDate today = LocalDate.now();
            if (date.isAfter(today)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, label + " cannot be in the future");
            }
            if (date.isBefore(today.minusYears(120))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, label + " is not valid");
            }
            if (date.isAfter(today.minusYears(13))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "You must be at least 13 years old");
            }
        } catch (DateTimeParseException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, label + " is not a valid date");
        }
    }

    private void validateSelect(ProfileField field, String value) {
        List<SelectOption> options = parseMeta(field.getOptionsJson()).options();
        boolean allowed = options.stream().anyMatch(option -> option.value().equals(value));
        if (!allowed) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid value for " + field.getLabel());
        }
    }

    private void applyIdentity(User user, String key, String value) {
        if ("first_name".equals(key)) {
            user.setFirstName(value);
        } else if ("last_name".equals(key)) {
            user.setLastName(value);
        }
    }

    private String sanitize(String raw) {
        if (raw == null) {
            return null;
        }
        String cleaned = CONTROL_EXCEPT_NEWLINE.matcher(raw).replaceAll("").trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private User requireOnboardingUser(UUID userId) {
        User user = requireUser(userId);
        if (user.isOnboardingCompleted()) {
            throw new ApiException(HttpStatus.CONFLICT, "Onboarding is already complete");
        }
        return user;
    }

    private User requireProfileUser(UUID userId) {
        User user = requireUser(userId);
        if (user.getAppRole() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a role first");
        }
        return user;
    }

    private record FieldMeta(List<SelectOption> options, List<ItemField> itemFields) {
    }
}
