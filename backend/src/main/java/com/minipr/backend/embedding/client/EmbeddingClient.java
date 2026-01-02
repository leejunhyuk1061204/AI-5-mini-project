package com.minipr.backend.embedding.client;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Python AI 서버의 임베딩 API를 호출하는 클라이언트
 */
@Slf4j
@Component
public class EmbeddingClient {

    private final WebClient webClient;

    public EmbeddingClient(@Value("${python.ai.url:http://localhost:8001}") String aiServerUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServerUrl)
                .build();
    }

    /**
     * 단일 텍스트의 임베딩 벡터를 요청함
     */
    public Mono<EmbeddingResponse> getEmbedding(String text) {
        return webClient.post()
                .uri("/api/embedding")
                .bodyValue(new EmbeddingRequest(text))
                .retrieve()
                .bodyToMono(EmbeddingResponse.class)
                .doOnError(e -> log.error("임베딩 요청 실패: {}", e.getMessage()));
    }

    @Data
    public static class EmbeddingRequest {
        private final String text;
    }

    @Data
    public static class EmbeddingResponse {
        private List<Double> embedding;
    }
}
