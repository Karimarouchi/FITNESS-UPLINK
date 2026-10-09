package com.fitnessuplink.marketplace;

import java.util.Set;

public final class ItemCondition {
    public static final String NEW = "NEW";
    public static final String LIKE_NEW = "LIKE_NEW";
    public static final String USED = "USED";

    private static final Set<String> ALL = Set.of(NEW, LIKE_NEW, USED);

    private ItemCondition() {
    }

    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return NEW;
        }
        String upper = value.trim().toUpperCase();
        return ALL.contains(upper) ? upper : NEW;
    }

    public static boolean isValid(String value) {
        return value != null && ALL.contains(value);
    }
}
