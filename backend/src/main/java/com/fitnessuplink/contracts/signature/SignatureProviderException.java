package com.fitnessuplink.contracts.signature;

import org.springframework.http.HttpStatus;

import com.fitnessuplink.common.exception.ApiException;

public class SignatureProviderException extends ApiException {

    public SignatureProviderException() {
        super(HttpStatus.BAD_GATEWAY, "SIGNATURE_PROVIDER_ERROR");
    }
}
