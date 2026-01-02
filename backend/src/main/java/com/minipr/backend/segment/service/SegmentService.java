package com.minipr.backend.segment.service;

import com.minipr.backend.common.event.MeetingSegmentSavedEvent;
import com.minipr.backend.segment.entity.MeetingSegment;
import com.minipr.backend.segment.repository.MeetingSegmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SegmentService {

    private final MeetingSegmentRepository segmentRepository;
    private final ApplicationEventPublisher eventPublisher;

    public MeetingSegment saveSegment(MeetingSegment segment) {
        MeetingSegment savedSegment = segmentRepository.save(segment);

        // 임베딩 처리를 위한 이벤트 발행
        eventPublisher.publishEvent(new MeetingSegmentSavedEvent(savedSegment));

        return savedSegment;
    }
}
