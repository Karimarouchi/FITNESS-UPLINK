package com.fitnessuplink.billing;

public record ChargeResult(boolean success, String provider, String reference, String message) {
}
