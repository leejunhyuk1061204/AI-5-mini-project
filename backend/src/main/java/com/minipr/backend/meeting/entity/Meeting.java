package com.minipr.backend.meeting.entity;

import com.minipr.backend.member.entity.Member;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "meeting")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "meeting_id", nullable = false)
    private Integer meetingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Lob
    @Column(name = "full_text", columnDefinition = "LONGTEXT")
    private String fullText; // 전체 회의 기록 (화자 분리된 원문)

    @Lob
    @Column(name = "summary", columnDefinition = "LONGTEXT")
    private String summary; // AI 요약 본

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @ColumnDefault("'PROCEEDING'")
    private MeetingStatus status = MeetingStatus.PROCEEDING; // 비동기 제어용

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    public Meeting(Member member, String title) {
        this.member = member;
        this.title = title;
        this.status = MeetingStatus.PROCEEDING;
    }

    public Meeting(Member member, String title, String fullText) {
        this.member = member;
        this.title = title;
        this.fullText = fullText;
        this.status = MeetingStatus.PROCEEDING;
    }

    public void updateStatus(MeetingStatus status) {
        this.status = status;
    }

    public void updateFullText(String fullText) {
        this.fullText = fullText;
    }

    public void updateSummary(String summary) {
        this.summary = summary;
    }
}
