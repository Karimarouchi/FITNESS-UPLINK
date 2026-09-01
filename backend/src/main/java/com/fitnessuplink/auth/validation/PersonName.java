package com.fitnessuplink.auth.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = PersonNameValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface PersonName {

    String message() default "Use letters only, with optional spaces, hyphens or apostrophes";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
