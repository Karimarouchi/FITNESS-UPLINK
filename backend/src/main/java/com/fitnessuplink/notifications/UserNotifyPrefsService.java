package com.fitnessuplink.notifications;

import com.fitnessuplink.notifications.dto.UpdateUserNotifyPrefsRequest;
import com.fitnessuplink.notifications.dto.UserNotifyPrefsDto;
import com.fitnessuplink.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserNotifyPrefsService {

    private final UserNotifyPrefsRepository userNotifyPrefsRepository;

    @Transactional(readOnly = true)
    public UserNotifyPrefsDto get(User user) {
        return userNotifyPrefsRepository.findById(user.getId())
                .map(this::toDto)
                .orElseGet(UserNotifyPrefsDto::defaults);
    }

    @Transactional
    public UserNotifyPrefsDto update(User user, UpdateUserNotifyPrefsRequest request) {
        UserNotifyPrefs prefs = userNotifyPrefsRepository.findById(user.getId()).orElseGet(() -> {
            UserNotifyPrefsDto defaults = UserNotifyPrefsDto.defaults();
            return UserNotifyPrefs.builder()
                    .userId(user.getId())
                    .inAppContact(defaults.inAppContact())
                    .emailContact(defaults.emailContact())
                    .inAppMessage(defaults.inAppMessage())
                    .emailMessage(defaults.emailMessage())
                    .inAppApplication(defaults.inAppApplication())
                    .emailApplication(defaults.emailApplication())
                    .inAppDocument(defaults.inAppDocument())
                    .emailDocument(defaults.emailDocument())
                    .inAppContract(defaults.inAppContract())
                    .emailContract(defaults.emailContract())
                    .updatedAt(Instant.now())
                    .build();
        });
        UserNotifyPrefsDto current = toDto(prefs);
        prefs.setInAppContact(first(request.inAppContact(), current.inAppContact()));
        prefs.setEmailContact(first(request.emailContact(), current.emailContact()));
        prefs.setInAppMessage(first(request.inAppMessage(), current.inAppMessage()));
        prefs.setEmailMessage(first(request.emailMessage(), current.emailMessage()));
        prefs.setInAppApplication(first(request.inAppApplication(), current.inAppApplication()));
        prefs.setEmailApplication(first(request.emailApplication(), current.emailApplication()));
        prefs.setInAppDocument(first(request.inAppDocument(), current.inAppDocument()));
        prefs.setEmailDocument(first(request.emailDocument(), current.emailDocument()));
        prefs.setInAppContract(first(request.inAppContract(), current.inAppContract()));
        prefs.setEmailContract(first(request.emailContract(), current.emailContract()));
        prefs.setUpdatedAt(Instant.now());
        return toDto(userNotifyPrefsRepository.save(prefs));
    }

    @Transactional(readOnly = true)
    public boolean allowsInApp(UUID userId, NotifyCategory category) {
        return allowed(userNotifyPrefsRepository.findById(userId).orElse(null), category, true);
    }

    @Transactional(readOnly = true)
    public boolean allowsEmail(UUID userId, NotifyCategory category) {
        return allowed(userNotifyPrefsRepository.findById(userId).orElse(null), category, false);
    }

    private boolean allowed(UserNotifyPrefs prefs, NotifyCategory category, boolean inApp) {
        if (prefs == null || category == null) {
            return true;
        }
        return switch (category) {
            case CONTACT -> inApp ? prefs.isInAppContact() : prefs.isEmailContact();
            case MESSAGE -> inApp ? prefs.isInAppMessage() : prefs.isEmailMessage();
            case APPLICATION -> inApp ? prefs.isInAppApplication() : prefs.isEmailApplication();
            case DOCUMENT -> inApp ? prefs.isInAppDocument() : prefs.isEmailDocument();
            case CONTRACT -> inApp ? prefs.isInAppContract() : prefs.isEmailContract();
        };
    }

    private UserNotifyPrefsDto toDto(UserNotifyPrefs prefs) {
        return new UserNotifyPrefsDto(
                prefs.isInAppContact(),
                prefs.isEmailContact(),
                prefs.isInAppMessage(),
                prefs.isEmailMessage(),
                prefs.isInAppApplication(),
                prefs.isEmailApplication(),
                prefs.isInAppDocument(),
                prefs.isEmailDocument(),
                prefs.isInAppContract(),
                prefs.isEmailContract()
        );
    }

    private static boolean first(Boolean value, boolean fallback) {
        return value == null ? fallback : value;
    }
}
