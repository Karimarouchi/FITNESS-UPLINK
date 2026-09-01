package com.fitnessuplink.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI fitnessUplinkOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Fitness Uplink API")
                        .description("API REST de Fitness Uplink")
                        .version("v1"));
    }
}
