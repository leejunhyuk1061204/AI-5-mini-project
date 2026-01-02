package com.minipr.backend.segment.repository;

import com.minipr.backend.segment.entity.MeetingSegment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeetingSegmentRepository extends JpaRepository<MeetingSegment, Long> {

    List<MeetingSegment> findByMeetingMeetingIdOrderBySegmentSeqAsc(Integer meetingId);
}
