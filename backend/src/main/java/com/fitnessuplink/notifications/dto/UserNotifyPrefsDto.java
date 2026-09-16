package com.fitnessuplink.notifications.dto;

public record UserNotifyPrefsDto(
        boolean inAppContact,
        boolean emailContact,
        boolean inAppMessage,
        boolean emailMessage,
        boolean inAppApplication,
        boolean emailApplication,
        boolean inAppDocument,
        boolean emailDocument,
        boolean inAppContract,
        boolean emailContract
) {
    public static UserNotifyPrefsDto defaults() {
        return new UserNotifyPrefsDto(true, true, true, true, true, true, true, true, true, true);
    }
}
