package com.minipr.backend.segment.service;

import com.minipr.backend.common.event.MeetingSegmentSavedEvent;
import com.minipr.backend.segment.entity.RealtimeSegment;
import com.minipr.backend.segment.repository.RealtimeSegmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SegmentService {

    private final RealtimeSegmentRepository segmentRepository;
    private final ApplicationEventPublisher eventPublisher;

    public RealtimeSegment saveSegment(RealtimeSegment segment) {
        RealtimeSegment savedSegment = segmentRepository.save(segment);

        // 임베딩 처리를 위한 이벤트 발행
        eventPublisher.publishEvent(new MeetingSegmentSavedEvent(savedSegment));

        return savedSegment;
    }
}
