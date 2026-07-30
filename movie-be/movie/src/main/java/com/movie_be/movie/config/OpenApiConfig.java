package com.movie_be.movie.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static io.swagger.v3.oas.models.security.SecurityScheme.Type.HTTP;
import static io.swagger.v3.oas.models.security.SecurityScheme.In.HEADER;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        String bearerFormat = "JWT";

        SecurityScheme securityScheme = new SecurityScheme()
                .type(HTTP)
                .scheme("bearer")
                .bearerFormat(bearerFormat)
                .in(HEADER);

        SecurityRequirement securityRequirement = new SecurityRequirement()
                .addList("bearerAuth");

        return new OpenAPI()
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", securityScheme))
                .addSecurityItem(securityRequirement);
    }
}

