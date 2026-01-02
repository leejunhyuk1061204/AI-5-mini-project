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

        // ===== 요청 로그 =====
        System.out.println("========================================");
        System.out.println("📤 [Java→Python] Whisper API 요청 전송");
        System.out.println("   📁 파일명: " + filename);
        System.out.println("   📊 데이터 크기: " + audioData.length + " bytes");
        System.out.println("   🔗 URL: " + "/api/transcribe");
        long startTime = System.currentTimeMillis();

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new ByteArrayResource(audioData) {
            @Override
            public String getFilename() {
                return filename;
            }
        });

        return webClient.post()
                .uri("/api/transcribe")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(TranscribeResponse.class)
                .doOnSuccess(response -> {
                    long took = System.currentTimeMillis() - startTime;
                    System.out.println("========================================");
                    System.out.println("📥 [Python→Java] Whisper API 응답 수신");
                    System.out.println("   📝 텍스트: " + (response.getText().length() > 80
                            ? response.getText().substring(0, 80) + "..."
                            : response.getText()));
                    System.out.println("   🌐 언어: " + response.getLanguage());
                    System.out.println("   ⏱️  오디오 길이: " + response.getDuration() + "초");
                    System.out.println("   ⚡ Python 처리: " + response.getTookMs() + "ms");
                    System.out.println("   🔄 전체 RTT: " + took + "ms");
                    System.out.println("========================================");
                })
                .doOnError(error -> {
                    System.out.println("========================================");
                    System.out.println("❌ [Java] Whisper API 호출 실패!");
                    System.out.println("   에러: " + error.getMessage());
                    System.out.println("========================================");
                    log.error("Whisper API 호출 실패: {}", error.getMessage());
                });
    }
}
