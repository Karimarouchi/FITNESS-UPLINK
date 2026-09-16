package com.fitnessuplink.notifications.dto;

public record UpdateUserNotifyPrefsRequest(
        Boolean inAppContact,
        Boolean emailContact,
        Boolean inAppMessage,
        Boolean emailMessage,
        Boolean inAppApplication,
        Boolean emailApplication,
        Boolean inAppDocument,
        Boolean emailDocument,
        Boolean inAppContract,
        Boolean emailContract
) {
}
