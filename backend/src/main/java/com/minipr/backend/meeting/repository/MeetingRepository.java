package com.minipr.backend.meeting.repository;

import com.minipr.backend.meeting.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeetingRepository extends JpaRepository<Meeting, Integer> {
    List<Meeting> findByMember_MemberId(Integer memberId);
}
