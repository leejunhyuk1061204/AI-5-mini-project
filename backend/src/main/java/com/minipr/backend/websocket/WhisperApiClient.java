package com.minipr.backend.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Python AI Whisper API 클라이언트
 * /api/transcribe 엔드포인트 호출
 */
@Slf4j
@Component
public class WhisperApiClient {

    private final WebClient webClient;

    public WhisperApiClient(@Value("${python.ai.url:http://localhost:8000}") String pythonAiUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(pythonAiUrl)
                .build();
        log.info("WhisperApiClient 초기화됨: baseUrl={}", pythonAiUrl);
    }

    /**
     * 오디오 데이터를 Whisper API로 전송하여 텍스트로 변환
     */
    public Mono<TranscribeResponse> transcribe(byte[] audioData) {
        String filename = "audio_" + System.currentTimeMillis() + ".webm";

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        // long startTime = System.currentTimeMillis();

        builder.part("file", new ByteArrayResource(audioData) {
            @Override
            public String getFilename() {
                return filename;
            }
        });

        // log.debug("📤 [Whisper] Request: size={} bytes", audioData.length); //
        // Optional: keep as debug or remove

        return webClient.post()
                .uri("/api/transcribe")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(TranscribeResponse.class)
                .doOnSuccess(response -> {
                    // long took = System.currentTimeMillis() - startTime;
                    // log.info("📥 [Whisper] Response: {}ms (Python: {}ms)", took,
                    // response.getTookMs()); // Keep it simple
                })
                .doOnError(error -> {
                    log.error("❌ [Whisper] API Fail: {}", error.getMessage());
                });
    }
}
