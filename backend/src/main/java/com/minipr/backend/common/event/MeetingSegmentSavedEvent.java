package com.minipr.backend.common.event;

import com.minipr.backend.segment.entity.RealtimeSegment;
import lombok.Getter;

/**
 * 세그먼트가 저장되었을 때 발생하는 이벤트
 * 비동기 임베딩 처리를 트리거함
 */
@Getter
public class MeetingSegmentSavedEvent {
    private final RealtimeSegment segment;

    public MeetingSegmentSavedEvent(RealtimeSegment segment) {
        this.segment = segment;
    }
}
