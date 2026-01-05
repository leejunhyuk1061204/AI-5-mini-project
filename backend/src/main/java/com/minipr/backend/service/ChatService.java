package com.minipr.backend.service;

import com.minipr.backend.embedding.client.EmbeddingClient;
import com.minipr.backend.embedding.entity.Embedding;
import com.minipr.backend.embedding.entity.FinalEmbedding;
import com.minipr.backend.embedding.repository.EmbeddingRepository;
import com.minipr.backend.embedding.repository.FinalEmbeddingRepository;
import com.minipr.backend.meeting.entity.Meeting;
import com.minipr.backend.meeting.entity.MeetingStatus;
import com.minipr.backend.meeting.repository.MeetingRepository;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ChatService {

    private final EmbeddingClient embeddingClient;
    private final EmbeddingRepository embeddingRepository;
    private final FinalEmbeddingRepository finalEmbeddingRepository;
    private final MeetingRepository meetingRepository;
    private final WebClient.Builder webClientBuilder;
    private final TransactionTemplate transactionTemplate;

    @Value("${python.ai.url:http://localhost:8001}")
    private String aiServerUrl;

    public ChatService(EmbeddingClient embeddingClient,
            EmbeddingRepository embeddingRepository,
            FinalEmbeddingRepository finalEmbeddingRepository,
            MeetingRepository meetingRepository,
            WebClient.Builder webClientBuilder,
            PlatformTransactionManager transactionManager) {
        this.embeddingClient = embeddingClient;
        this.embeddingRepository = embeddingRepository;
        this.finalEmbeddingRepository = finalEmbeddingRepository;
        this.meetingRepository = meetingRepository;
        this.webClientBuilder = webClientBuilder;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * WebFlux 환경에서 JPA(Blocking)를 안전하게 처리하기 위해 boundedElastic 스케줄러를 사용합니다.
     */
    public Mono<ChatResponse> chat(ChatRequest request) {
        log.info("Chat request started - meetingId: {}, message: {}, sessionId: {}",
                request.getMeetingId(), request.getMessage(), request.getSessionId());

        // 1. 질문 벡터화 (Non-blocking)
        return embeddingClient.getEmbedding(request.getMessage())
                .flatMap(embResp -> {
                    List<Double> vector = embResp.getEmbedding();
                    log.info("1. Vectorization complete - Dimension: {}", (vector != null ? vector.size() : 0));

                    if (vector == null || vector.isEmpty()) {
                        return Mono.error(new RuntimeException("Embedding vector is null or empty"));
                    }

                    // vectorString 제거됨 - Java에서 직접 vector List 사용

                    // 2. DB에서 해당 meeting의 상태 확인 후 적절한 테이블에서 조회
                    return Mono.fromCallable(() -> {
                        log.info("2. [Thread: {}] Checking meeting status and fetching embeddings for meetingId: {}",
                                Thread.currentThread().getName(), request.getMeetingId());

                        return transactionTemplate.execute(status -> {
                            try {
                                Meeting meeting = null;
                                if (request.getMeetingId() != null && request.getMeetingId() > 0) {
                                    meeting = meetingRepository.findById(request.getMeetingId())
                                            .orElse(null);
                                }

                                List<String> contextSegments;

                                if (Boolean.TRUE.equals(request.getSearchAll()) && request.getMemberId() != null) {
                                    log.info(
                                            "Global Search enabled for memberId: {}. Fetching all finalized embeddings.",
                                            request.getMemberId());
                                    List<FinalEmbedding> allEmbeddings = finalEmbeddingRepository
                                            .findAllByFinalSegment_Meeting_Member_MemberId(request.getMemberId());

                                    contextSegments = allEmbeddings.stream()
                                            .filter(e -> e.getFinalSegment() != null && e.getEmbedding() != null)
                                            .sorted(java.util.Comparator.comparingDouble(
                                                    (FinalEmbedding e) -> cosineSimilarity(vector,
                                                            parseVectorString(e.getEmbedding())))
                                                    .reversed())
                                            .limit(10) // Global search might need more context
                                            .map(e -> "[" + e.getFinalSegment().getMeeting().getTitle() + "] "
                                                    + e.getFinalSegment().getChunkText())
                                            .collect(Collectors.toList());
                                } else if (meeting != null && meeting.getStatus() == MeetingStatus.COMPLETED) {
                                    log.info("Meeting is COMPLETED. Using final_embeddings table.");
                                    List<FinalEmbedding> allEmbeddings = finalEmbeddingRepository
                                            .findAllByFinalSegment_Meeting_MeetingId(request.getMeetingId());

                                    contextSegments = allEmbeddings.stream()
                                            .filter(e -> e.getFinalSegment() != null && e.getEmbedding() != null)
                                            .sorted(java.util.Comparator.comparingDouble(
                                                    (FinalEmbedding e) -> cosineSimilarity(vector,
                                                            parseVectorString(e.getEmbedding())))
                                                    .reversed())
                                            .limit(5)
                                            .map(e -> e.getFinalSegment().getChunkText())
                                            .collect(Collectors.toList());
                                } else if (meeting != null && (meeting.getStatus() == MeetingStatus.PROCEEDING
                                        || meeting.getStatus() == MeetingStatus.RECORDED)) {
                                    log.info("Meeting is in {} status. Using real-time embeddings table.",
                                            meeting.getStatus());
                                    List<Embedding> allEmbeddings = embeddingRepository
                                            .findAllBySegmentMeetingId(request.getMeetingId());

                                    contextSegments = allEmbeddings.stream()
                                            .filter(e -> e.getSegment() != null && e.getEmbedding() != null)
                                            .sorted(java.util.Comparator.comparingDouble(
                                                    (Embedding e) -> cosineSimilarity(vector,
                                                            parseVectorString(e.getEmbedding())))
                                                    .reversed())
                                            .limit(5)
                                            .map(e -> e.getSegment().getChunkText())
                                            .collect(Collectors.toList());
                                } else {
                                    // ANALYZING or FAILED or No Meeting (Global Chat)
                                    log.info("No active meeting context found (meetingId={} status={}). Returns empty context.",
                                            request.getMeetingId(), (meeting != null ? meeting.getStatus() : "N/A"));
                                    contextSegments = List.of();
                                }

                                log.info("3. Found {} valid segments for context", contextSegments.size());
                                return contextSegments;

                            } catch (Exception e) {
                                log.error("Error during Dynamic Vector Search: {}", e.getMessage(), e);
                                throw new RuntimeException("Vector Search failed", e);
                            }
                        });
                    }).subscribeOn(Schedulers.boundedElastic());
                })
                .flatMap(contextSegments -> {
                    log.info("4. Context prepared - Found {} valid segments",
                            (contextSegments != null ? contextSegments.size() : 0));

                    // 3. AI 서버에 최종 챗 요청 보내기 (Non-blocking)
                    Map<String, Object> aiRequest = new HashMap<>();
                    aiRequest.put("message", request.getMessage());
                    aiRequest.put("session_id", request.getSessionId());
                    aiRequest.put("history", request.getHistory());

                    Map<String, Object> context = new HashMap<>();
                    context.put("retrieved_segments", contextSegments);
                    aiRequest.put("context", context);

                    log.info("5. Sending request to AI server Chat API: {}", aiServerUrl + "/api/chat");

                    return webClientBuilder.build().post()
                            .uri(aiServerUrl + "/api/chat")
                            .header("Content-Type", "application/json")
                            .bodyValue(aiRequest)
                            .retrieve()
                            .onStatus(status -> status.isError(), response -> response.bodyToMono(String.class)
                                    .flatMap(body -> {
                                        log.error("AI Server returned error: Status={}, Body={}",
                                                response.statusCode(), body);
                                        return Mono.error(
                                                new RuntimeException("AI Server Error: " + response.statusCode()));
                                    }))
                            .bodyToMono(ChatResponse.class)
                            .map(response -> {
                                if (response.getReply() != null) {
                                    // Remove <think>...</think> tags for cleaner output
                                    String cleanReply = response.getReply().replaceAll("(?s)<think>.*?</think>", "")
                                            .trim();
                                    response.setReply(cleanReply);
                                }
                                return response;
                            })
                            .doOnNext(resp -> log.info("6. AI Server responded successfully"))
                            .doOnError(e -> log.error("Chat Step 5 failed: {}", e.getMessage()));
                })
                .doOnError(e -> {
                    log.error("Chat process failed fatally - Type: {}, Message: {}", e.getClass().getName(),
                            e.getMessage());
                });
    }

    /**
     * MySQL VECTOR_TO_STRING 결과를 List<Double>로 파싱
     * 형식: "[1.00000e+00,2.00000e+00,3.00000e+00]"
     */
    private List<Double> parseVectorString(String vectorString) {
        if (vectorString == null || vectorString.isEmpty()) {
            return List.of();
        }
        // 대괄호 제거 및 콤마로 분리
        String cleaned = vectorString.replace("[", "").replace("]", "").trim();
        if (cleaned.isEmpty()) {
            return List.of();
        }
        return java.util.Arrays.stream(cleaned.split(","))
                .map(String::trim)
                .map(Double::parseDouble)
                .collect(Collectors.toList());
    }

    /**
     * 두 벡터 간의 코사인 유사도 계산
     * 값이 1에 가까울수록 유사, -1에 가까울수록 반대
     */
    private double cosineSimilarity(List<Double> v1, List<Double> v2) {
        if (v1.size() != v2.size() || v1.isEmpty()) {
            return -1.0; // 비교 불가 시 최저 유사도
        }
        double dotProduct = 0;
        double normV1 = 0;
        double normV2 = 0;
        for (int i = 0; i < v1.size(); i++) {
            dotProduct += v1.get(i) * v2.get(i);
            normV1 += v1.get(i) * v1.get(i);
            normV2 += v2.get(i) * v2.get(i);
        }
        if (normV1 == 0 || normV2 == 0) {
            return 0.0;
        }
        return dotProduct / (Math.sqrt(normV1) * Math.sqrt(normV2));
    }

    @Data
    public static class ChatRequest {
        private Integer meetingId;
        private Integer memberId;
        private Boolean searchAll;
        private String message;

        @com.fasterxml.jackson.annotation.JsonProperty("session_id")
        private String sessionId;

        private List<Map<String, String>> history;
    }

    @Data
    public static class ChatResponse {
        @com.fasterxml.jackson.annotation.JsonProperty("session_id")
        private String sessionId;

        private String reply;
        private int took_ms;
    }
}
