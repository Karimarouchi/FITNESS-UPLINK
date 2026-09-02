package com.fitnessuplink.onboarding;

import com.fitnessuplink.catalog.ProfileField;
import com.fitnessuplink.catalog.RoleProfileField;
import com.fitnessuplink.catalog.RoleProfileFieldRepository;
import com.fitnessuplink.common.exception.ApiException;
import com.fitnessuplink.onboarding.dto.UploadResponse;
import com.fitnessuplink.user.User;
import com.fitnessuplink.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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

        String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType().toLowerCase(Locale.ROOT);
        validateType(field, contentType);
        long max = maxBytesFor(field);
        if (file.getSize() > max) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This file is too large");
        }

        UUID id = UUID.randomUUID();
        String extension = extensionOf(file.getOriginalFilename(), contentType);
        Path directory = Path.of(uploadProperties.dir(), userId.toString()).toAbsolutePath().normalize();
        Path target = directory.resolve(id + extension);
        try {
            Files.createDirectories(directory);
            file.transferTo(target.toFile());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store file");
        }

        UserUpload upload = UserUpload.builder()
                .id(id)
                .userId(userId)
                .fieldKey(fieldKey)
                .originalFilename(safeName(file.getOriginalFilename()))
                .contentType(contentType)
                .sizeBytes(file.getSize())
                .storagePath(target.toString())
                .createdAt(Instant.now())
                .build();
        userUploadRepository.save(upload);
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
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store file");
        }
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
        UUID id = UUID.randomUUID();
        Path directory = Path.of(uploadProperties.dir(), userId.toString(), "contracts").toAbsolutePath().normalize();
        Path target = directory.resolve(id + ".pdf");
        try {
            Files.createDirectories(directory);
            Files.write(target, bytes);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store file");
        }
        UserUpload upload = UserUpload.builder()
                .id(id)
                .userId(userId)
                .fieldKey(fieldKey)
                .originalFilename(safeName(filename.endsWith(".pdf") ? filename : filename + ".pdf"))
                .contentType("application/pdf")
                .sizeBytes(bytes.length)
                .storagePath(target.toString())
                .createdAt(Instant.now())
                .build();
        return userUploadRepository.save(upload);
    }

    public byte[] readBytes(UUID uploadId) {
        UserUpload upload = userUploadRepository.findById(uploadId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "File not found"));
        try {
            return Files.readAllBytes(Path.of(upload.getStoragePath()));
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.NOT_FOUND, "File not found");
        }
    }

    private LoadedUpload resourceOf(UserUpload upload) {
        Resource resource = new FileSystemResource(upload.getStoragePath());
        if (!resource.exists()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "File not found");
        }
        return new LoadedUpload(upload, resource);
    }

    public boolean belongsTo(UUID userId, UUID uploadId, String fieldKey) {
        return userUploadRepository.findByIdAndUserId(uploadId, userId)
                .filter(upload -> upload.getFieldKey().equals(fieldKey))
                .isPresent();
    }

    private void validateType(ProfileField field, String contentType) {
        String accept = field.getAccept();
        if (accept != null && !accept.isBlank()) {
            boolean ok = java.util.Arrays.stream(accept.split(","))
                    .map(String::trim)
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

    private long maxBytesFor(ProfileField field) {
        String type = field.getFieldType() == null ? "" : field.getFieldType().toUpperCase(Locale.ROOT);
        return switch (type) {
            case "PHOTO" -> 5L * 1024 * 1024;
            case "FILES", "FILE" -> field.getFieldKey().contains("video") ? 50L * 1024 * 1024 : 10L * 1024 * 1024;
            default -> uploadProperties.maxBytes();
        };
    }

    private String extensionOf(String filename, String contentType) {
        if (filename != null && filename.contains(".") && !filename.endsWith(".")) {
            String ext = filename.substring(filename.lastIndexOf('.')).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9.]", "");
            if (ext.length() >= 2 && ext.length() <= 8) {
                return ext;
            }
        }
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "application/pdf" -> ".pdf";
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            default -> "";
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
