package com.minipr.backend.segment.repository;

import com.minipr.backend.segment.entity.FinalSegment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FinalSegmentRepository extends JpaRepository<FinalSegment, Long> {
    List<FinalSegment> findByMeeting_MeetingIdOrderBySegmentSeq(Integer meetingId);
}
