package com.minipr.backend.meeting.dto;

import com.minipr.backend.meeting.entity.Meeting;

import java.time.LocalDateTime;

public record MeetingResponse(
        Integer meetingId,
        Integer memberId,
        String title,
        String fullText,
        LocalDateTime createdAt
) {
    public static MeetingResponse from(Meeting m) {
        return new MeetingResponse(
                m.getMeetingId(),
                m.getMember().getMemberId(),
                m.getTitle(),
                m.getFullText(),
                m.getCreatedAt()
        );
    }
}
