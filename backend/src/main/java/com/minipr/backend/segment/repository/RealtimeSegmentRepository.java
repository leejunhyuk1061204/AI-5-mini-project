package com.minipr.backend.segment.repository;

import com.minipr.backend.segment.entity.RealtimeSegment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RealtimeSegmentRepository extends JpaRepository<RealtimeSegment, Long> {
    List<RealtimeSegment> findByMeeting_MeetingIdOrderBySegmentSeqAsc(Integer meetingId);

    void deleteByMeeting_MeetingId(Integer meetingId);
}
