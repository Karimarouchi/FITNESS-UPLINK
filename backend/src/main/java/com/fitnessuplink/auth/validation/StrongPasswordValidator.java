package com.fitnessuplink.auth.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }
        return value.length() >= 8
                && value.length() <= 128
                && value.chars().noneMatch(Character::isWhitespace)
                && value.chars().anyMatch(Character::isUpperCase)
                && value.chars().anyMatch(Character::isDigit)
                && value.chars().anyMatch(ch -> !Character.isLetterOrDigit(ch));
    }
}
