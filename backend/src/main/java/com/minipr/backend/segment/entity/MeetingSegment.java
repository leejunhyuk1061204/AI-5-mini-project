package com.minipr.backend.segment.entity;

import com.minipr.backend.meeting.entity.Meeting;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

/**
 * 슬라이딩 윈도우 조각들 - 텍스트 조각과 화자 정보를 관리
 */
@Entity
@Table(name = "segments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "segment_id", nullable = false)
    private Long segmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @Column(name = "segment_seq", nullable = false)
    private Integer segmentSeq; // 대화 순서

    @Lob
    @Column(name = "chunk_text", nullable = false, columnDefinition = "TEXT")
    private String chunkText; // 30% 중첩된 텍스트 조각

    @Column(name = "start_time")
    private Integer startTime; // 회의 시작 후 N초 (초 단위)

    @Column(name = "speaker_label", length = 50)
    private String speakerLabel; // Diarization 결과 (ex: Speaker A)

    @Enumerated(EnumType.STRING)
    @Column(name = "embedding_status", nullable = false)
    @ColumnDefault("'PENDING'")
    private EmbeddingStatus embeddingStatus = EmbeddingStatus.PENDING; // 비동기 상태관리

    public MeetingSegment(Meeting meeting, Integer segmentSeq, String chunkText) {
        this.meeting = meeting;
        this.segmentSeq = segmentSeq;
        this.chunkText = chunkText;
        this.embeddingStatus = EmbeddingStatus.PENDING;
    }

    public MeetingSegment(Meeting meeting, Integer segmentSeq, String chunkText,
            Integer startTime, String speakerLabel) {
        this.meeting = meeting;
        this.segmentSeq = segmentSeq;
        this.chunkText = chunkText;
        this.startTime = startTime;
        this.speakerLabel = speakerLabel;
        this.embeddingStatus = EmbeddingStatus.PENDING;
    }

    public void updateEmbeddingStatus(EmbeddingStatus status) {
        this.embeddingStatus = status;
    }

    /**
     * 초 단위 시간을 HH:MM:SS 형식으로 변환
     */
    public String getFormattedStartTime() {
        if (startTime == null)
            return null;
        int hours = startTime / 3600;
        int minutes = (startTime % 3600) / 60;
        int seconds = startTime % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }
}
