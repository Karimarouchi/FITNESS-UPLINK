package com.fitnessuplink.onboarding;

import com.fitnessuplink.catalog.ProfileField;
import com.fitnessuplink.catalog.RoleProfileField;
import com.fitnessuplink.catalog.RoleProfileFieldRepository;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.dto.UploadResponse;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UploadService {

    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> DOC_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    private static final Set<String> VIDEO_TYPES = Set.of("video/mp4", "video/webm");

    private final UserRepository userRepository;
    private final RoleProfileFieldRepository roleProfileFieldRepository;
    private final UserUploadRepository userUploadRepository;
    private final UploadProperties uploadProperties;

    @Transactional
    public UploadResponse store(UUID userId, String fieldKey, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a file");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getAppRole() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a role first");
        }
        ProfileField field = roleProfileFieldRepository.findByRole_IdOrderBySortOrderAsc(user.getAppRole().getId()).stream()
                .map(RoleProfileField::getField)
                .filter(item -> item.getFieldKey().equals(fieldKey))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown profile field"));

        byte[] bytes = readFileBytes(file);
        String contentType = resolveContentType(file.getContentType(), file.getOriginalFilename(), bytes);
        validateType(field, contentType);
        long max = maxBytesFor(field);
        if (bytes.length > max) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This file is too large");
        }

        UserUpload upload = persist(userId, fieldKey, safeName(file.getOriginalFilename()), contentType, bytes);
        return toResponse(upload);
    }

    @Transactional(readOnly = true)
    public LoadedUpload load(UUID userId, UUID uploadId) {
        UserUpload upload = userUploadRepository.findByIdAndUserId(uploadId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "File not found"));
        return resourceOf(upload);
    }

    @Transactional(readOnly = true)
    public LoadedUpload loadAny(UUID uploadId) {
        UserUpload upload = userUploadRepository.findById(uploadId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "File not found"));
        return resourceOf(upload);
    }

    @Transactional
    public UserUpload storePdf(UUID userId, String fieldKey, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE_TYPE");
        }
        byte[] bytes = readFileBytes(file);
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String filename = file.getOriginalFilename() == null ? "contract.pdf" : file.getOriginalFilename();
        if (!"application/pdf".equals(contentType) && !filename.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE_TYPE");
        }
        return storePdfBytes(userId, fieldKey, filename, bytes);
    }

    @Transactional
    public UserUpload storePdfBytes(UUID userId, String fieldKey, String filename, byte[] bytes) {
        if (bytes == null || bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F') {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE_TYPE");
        }
        long max = 10L * 1024 * 1024;
        if (bytes.length > max) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE");
        }
        return persist(
                userId,
                fieldKey,
                safeName(filename.endsWith(".pdf") ? filename : filename + ".pdf"),
                "application/pdf",
                bytes
        );
    }

    public byte[] readBytes(UUID uploadId) {
        UserUpload upload = userUploadRepository.findById(uploadId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "File not found"));
        return bytesOf(upload);
    }

    public boolean belongsTo(UUID userId, UUID uploadId, String fieldKey) {
        return userUploadRepository.findByIdAndUserId(uploadId, userId)
                .filter(upload -> upload.getFieldKey().equals(fieldKey))
                .isPresent();
    }

    private UserUpload persist(UUID userId, String fieldKey, String filename, String contentType, byte[] bytes) {
        UserUpload upload = UserUpload.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .fieldKey(fieldKey)
                .originalFilename(filename)
                .contentType(contentType)
                .sizeBytes(bytes.length)
                .content(bytes)
                .createdAt(Instant.now())
                .build();
        return userUploadRepository.save(upload);
    }

    private LoadedUpload resourceOf(UserUpload upload) {
        return new LoadedUpload(upload, new ByteArrayResource(bytesOf(upload)));
    }

    private byte[] bytesOf(UserUpload upload) {
        if (upload.getContent() != null && upload.getContent().length > 0) {
            return upload.getContent();
        }
        String path = upload.getStoragePath();
        if (path != null && !path.isBlank() && !"db".equals(path)) {
            Resource resource = new FileSystemResource(path);
            if (resource.exists()) {
                try {
                    return Files.readAllBytes(Path.of(path));
                } catch (IOException ex) {
                    throw new ApiException(HttpStatus.NOT_FOUND, "File not found");
                }
            }
        }
        throw new ApiException(HttpStatus.NOT_FOUND, "File not found");
    }

    private byte[] readFileBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store file");
        }
    }

    private void validateType(ProfileField field, String contentType) {
        String accept = field.getAccept();
        if (accept != null && !accept.isBlank()) {
            boolean ok = java.util.Arrays.stream(accept.split(","))
                    .map(String::trim)
                    .map(this::normalizeMime)
                    .anyMatch(allowed -> allowed.equalsIgnoreCase(contentType));
            if (!ok) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "This file type is not allowed");
            }
            return;
        }
        String type = field.getFieldType() == null ? "" : field.getFieldType().toUpperCase(Locale.ROOT);
        boolean allowed = switch (type) {
            case "PHOTO" -> IMAGE_TYPES.contains(contentType);
            case "FILE", "FILES" -> DOC_TYPES.contains(contentType) || IMAGE_TYPES.contains(contentType) || VIDEO_TYPES.contains(contentType);
            default -> false;
        };
        if (!allowed) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This file type is not allowed");
        }
    }

    private String resolveContentType(String declared, String filename, byte[] bytes) {
        String sniffed = sniffContentType(bytes);
        if (sniffed != null) {
            return sniffed;
        }
        String normalized = normalizeMime(declared);
        if (IMAGE_TYPES.contains(normalized) || DOC_TYPES.contains(normalized) || VIDEO_TYPES.contains(normalized)) {
            return normalized;
        }
        String fromName = typeFromFilename(filename);
        if (fromName != null) {
            return fromName;
        }
        return normalized.isBlank() ? "application/octet-stream" : normalized;
    }

    private String sniffContentType(byte[] bytes) {
        if (bytes == null || bytes.length < 3) {
            return null;
        }
        if (isJpeg(bytes)) {
            return "image/jpeg";
        }
        if (bytes.length >= 8 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) {
            return "image/png";
        }
        if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "image/webp";
        }
        if (bytes.length >= 4 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F') {
            return "application/pdf";
        }
        if (bytes.length >= 8 && new String(bytes, 4, 4, StandardCharsets.US_ASCII).equals("ftyp")) {
            return "video/mp4";
        }
        return null;
    }

    private boolean isJpeg(byte[] bytes) {
        return bytes.length >= 3 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF;
    }

    private String typeFromFilename(String filename) {
        if (filename == null || !filename.contains(".")) {
            return null;
        }
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        return switch (ext) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "pdf" -> "application/pdf";
            case "mp4" -> "video/mp4";
            case "webm" -> "video/webm";
            case "doc" -> "application/msword";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            default -> null;
        };
    }

    private String normalizeMime(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "";
        }
        String value = contentType.toLowerCase(Locale.ROOT).split(";", 2)[0].trim();
        return switch (value) {
            case "image/jpg", "image/pjpeg" -> "image/jpeg";
            case "image/x-png" -> "image/png";
            default -> value;
        };
    }

    private long maxBytesFor(ProfileField field) {
        String type = field.getFieldType() == null ? "" : field.getFieldType().toUpperCase(Locale.ROOT);
        return switch (type) {
            case "PHOTO" -> 5L * 1024 * 1024;
            case "FILES", "FILE" -> field.getFieldKey().contains("video") ? 50L * 1024 * 1024 : 10L * 1024 * 1024;
            default -> uploadProperties.maxBytes();
        };
    }

    private String safeName(String filename) {
        if (filename == null || filename.isBlank()) {
            return "file";
        }
        String cleaned = filename.replace("\\", "_").replace("/", "_").trim();
        return cleaned.length() > 180 ? cleaned.substring(cleaned.length() - 180) : cleaned;
    }

    private UploadResponse toResponse(UserUpload upload) {
        return new UploadResponse(
                upload.getId(),
                upload.getFieldKey(),
                upload.getOriginalFilename(),
                upload.getContentType(),
                upload.getSizeBytes()
        );
    }

    public record LoadedUpload(UserUpload upload, Resource resource) {
    }
}
