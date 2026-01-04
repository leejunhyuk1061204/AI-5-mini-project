package com.minipr.backend.embedding.listener;

import com.minipr.backend.common.event.MeetingSegmentSavedEvent;
import com.minipr.backend.embedding.client.EmbeddingClient;
import com.minipr.backend.embedding.repository.EmbeddingRepository;
import com.minipr.backend.segment.entity.EmbeddingStatus;
import com.minipr.backend.segment.entity.RealtimeSegment;
import com.minipr.backend.segment.repository.RealtimeSegmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

/**
 * MeetingSegmentSavedEvent를 구독하여 비동기적으로 임베딩을 처리하는 리스너
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmbeddingEventListener {

    private final EmbeddingClient embeddingClient;
    private final EmbeddingRepository embeddingRepository;
    private final RealtimeSegmentRepository segmentRepository;
    private final PlatformTransactionManager transactionManager;

    @Async
    @EventListener
    public void handleSegmentSavedEvent(MeetingSegmentSavedEvent event) {
        RealtimeSegment segment = event.getSegment();
        log.info("비동기 임베딩 시작: segmentId={}, text={}", segment.getSegmentId(), segment.getChunkText());

        try {
            // 1. AI 서버 호출하여 임베딩 가져오기
            EmbeddingClient.EmbeddingResponse response = embeddingClient.getEmbedding(segment.getChunkText()).block();

            if (response != null && response.getEmbedding() != null) {
                List<Double> vector = response.getEmbedding();
                String vectorString = vector.toString();

                // 2. 네이티브 쿼리로 안전하게 저장 (새 트랜잭션)
                TransactionTemplate tt = new TransactionTemplate(transactionManager);
                tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                tt.executeWithoutResult(status -> {
                    embeddingRepository.insertWithVector(segment.getSegmentId(), vectorString);
                });
                log.info("MySQL VECTOR 저장 성공: segmentId={}", segment.getSegmentId());

                // 3. 세그먼트 상태 업데이트 (새 트랜잭션)
                updateStatus(segment.getSegmentId(), EmbeddingStatus.COMPLETED);

                log.info("비동기 임베딩 완료: segmentId={}", segment.getSegmentId());
            }
        } catch (Exception e) {
            log.error("비동기 임베딩 실패: segmentId={}, error={}", segment.getSegmentId(), e.getMessage());
            updateStatus(segment.getSegmentId(), EmbeddingStatus.FAILED);
        }
    }

    private void updateStatus(Long segmentId, EmbeddingStatus status) {
        TransactionTemplate tt = new TransactionTemplate(transactionManager);
        tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tt.executeWithoutResult(s -> {
            segmentRepository.findById(segmentId).ifPresent(rs -> {
                rs.updateEmbeddingStatus(status);
                segmentRepository.save(rs);
            });
        });
    }
}
