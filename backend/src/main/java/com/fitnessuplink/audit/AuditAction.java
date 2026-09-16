package com.fitnessuplink.audit;

public final class AuditAction {
    public static final String LOGIN_SUCCESS = "LOGIN_SUCCESS";
    public static final String LOGIN_FAILED = "LOGIN_FAILED";
    public static final String ACCOUNT_LOCKED = "ACCOUNT_LOCKED";
    public static final String ACCOUNT_BLOCKED = "ACCOUNT_BLOCKED";
    public static final String ACCOUNT_UNBLOCKED = "ACCOUNT_UNBLOCKED";
    public static final String ACCOUNT_DELETED = "ACCOUNT_DELETED";
    public static final String VERIFICATION_ACCEPTED = "VERIFICATION_ACCEPTED";
    public static final String VERIFICATION_REJECTED = "VERIFICATION_REJECTED";
    public static final String SUBSCRIPTION_TRIAL_STARTED = "SUBSCRIPTION_TRIAL_STARTED";
    public static final String SUBSCRIPTION_ACTIVATED = "SUBSCRIPTION_ACTIVATED";
    public static final String SUBSCRIPTION_RENEWED = "SUBSCRIPTION_RENEWED";
    public static final String SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED";
    public static final String SUBSCRIPTION_SUSPENDED = "SUBSCRIPTION_SUSPENDED";
    public static final String SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED";

    private AuditAction() {
    }
}
