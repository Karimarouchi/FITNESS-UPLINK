package com.fitnessuplink.contracts.dto;

public record ContractTermsDto(
        String position,
        String contractType,
        String salaryAmount,
        String salaryCurrency,
        String startDate,
        String location,
        String extra
) {
}
