package com.fitnessuplink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class FitnessUplinkApplication {

    public static void main(String[] args) {
        SpringApplication.run(FitnessUplinkApplication.class, args);
    }
}
