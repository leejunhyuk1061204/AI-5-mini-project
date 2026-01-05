package com.minipr.backend.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                // .allowedOrigins(allowedOrigins.split(",")) // 기존 설정 제거

                .allowedOriginPatterns(
                        "http://localhost:3000",
                        "http://localhost:5173",
                        "https://*.netlify.app", // Netlify 배포 도메인
                        "https://*.ngrok-free.dev", // ngrok 도메인
                        "https://*.ngrok.io" // ngrok 구버전 도메인
                ) // 명시적 허용

                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("*")
                .allowCredentials(true);
    }
}
