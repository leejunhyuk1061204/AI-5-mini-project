package com.minipr.backend.segment.entity;

import com.minipr.backend.meeting.entity.Meeting;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

/**
 * 회의 종료 후 화자 분리(Diarization) 및 정제가 완료된 최종 세그먼트
 */
@Entity
@Table(name = "final_segments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FinalSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "final_segment_id", nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @Column(name = "segment_seq", nullable = false)
    private Integer segmentSeq;

    @Lob
    @Column(name = "chunk_text", nullable = false, columnDefinition = "TEXT")
    private String chunkText;

    @Column(name = "speaker_label", length = 50)
    private String speakerLabel; // e.g., "SPEAKER_00", "Kim"

    @Column(name = "start_time")
    private Integer startTime; // seconds

    @Enumerated(EnumType.STRING)
    @Column(name = "embedding_status", nullable = false)
    @ColumnDefault("'PENDING'")
    private EmbeddingStatus embeddingStatus = EmbeddingStatus.PENDING;

    public FinalSegment(Meeting meeting, Integer segmentSeq, String chunkText, String speakerLabel, Integer startTime) {
        this.meeting = meeting;
        this.segmentSeq = segmentSeq;
        this.chunkText = chunkText;
        this.speakerLabel = speakerLabel;
        this.startTime = startTime;
        this.embeddingStatus = EmbeddingStatus.PENDING;
    }

    public void updateEmbeddingStatus(EmbeddingStatus status) {
        this.embeddingStatus = status;
    }
}
