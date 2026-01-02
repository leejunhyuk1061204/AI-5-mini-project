package com.minipr.backend.embedding.listener;

import com.minipr.backend.common.event.MeetingSegmentSavedEvent;
import com.minipr.backend.embedding.client.EmbeddingClient;
import com.minipr.backend.embedding.client.EmbeddingClient;
import com.minipr.backend.segment.entity.EmbeddingStatus;
import com.minipr.backend.segment.entity.MeetingSegment;
import com.minipr.backend.segment.repository.MeetingSegmentRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * MeetingSegmentSavedEvent를 구독하여 비동기적으로 임베딩을 처리하는 리스너
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmbeddingEventListener {

    private final EmbeddingClient embeddingClient;
    private final MeetingSegmentRepository segmentRepository;
    private final EntityManager entityManager;

    @Async
    @Transactional
    @EventListener
    public void handleSegmentSavedEvent(MeetingSegmentSavedEvent event) {
        MeetingSegment segment = event.getSegment();
        log.info("비동기 임베딩 시작: segmentId={}, text={}", segment.getSegmentId(), segment.getChunkText());

        try {
            // 1. AI 서버 호출하여 임베딩 가져오기
            EmbeddingClient.EmbeddingResponse response = embeddingClient.getEmbedding(segment.getChunkText()).block();

            if (response != null && response.getEmbedding() != null) {
                List<Double> vector = response.getEmbedding();

                // 2. MySQL 9.5 VECTOR(768) 타입 저장을 위한 Native Query 사용
                // VECTOR_FROM_TEXT('[0.1, 0.2, ...]') 형식을 사용하거나,
                // 바이너리 형태로 변환하여 저장할 수 있음. 여기서는 문자열 기반 함수 사용.
                String vectorString = vector.toString();

                entityManager.createNativeQuery(
                        "INSERT INTO embeddings (segment_id, embedding) VALUES (?, VECTOR_FROM_TEXT(?))")
                        .setParameter(1, segment.getSegmentId())
                        .setParameter(2, vectorString)
                        .executeUpdate();

                // 3. 세그먼트 상태 업데이트
                MeetingSegment managedSegment = segmentRepository.findById(segment.getSegmentId()).orElseThrow();
                managedSegment.updateEmbeddingStatus(EmbeddingStatus.COMPLETED);
                segmentRepository.save(managedSegment);

                log.info("비동기 임베딩 완료: segmentId={}", segment.getSegmentId());
            }
        } catch (Exception e) {
            log.error("비동기 임베딩 실패: segmentId={}, error={}", segment.getSegmentId(), e.getMessage());
            MeetingSegment managedSegment = segmentRepository.findById(segment.getSegmentId()).orElse(null);
            if (managedSegment != null) {
                managedSegment.updateEmbeddingStatus(EmbeddingStatus.FAILED);
                segmentRepository.save(managedSegment);
            }
        }
    }
}
