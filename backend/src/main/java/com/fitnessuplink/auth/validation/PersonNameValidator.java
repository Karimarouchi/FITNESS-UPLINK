package com.fitnessuplink.auth.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class PersonNameValidator implements ConstraintValidator<PersonName, String> {

    private static final Pattern NAME = Pattern.compile("^\\p{L}[\\p{L} .'\\-]{0,79}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }
        String trimmed = value.trim();
        return !trimmed.isEmpty() && trimmed.length() <= 80 && NAME.matcher(trimmed).matches();
    }
}
