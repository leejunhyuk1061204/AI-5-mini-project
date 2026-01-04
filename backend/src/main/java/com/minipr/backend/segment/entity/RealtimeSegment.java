package com.minipr.backend.segment.entity;

import com.minipr.backend.meeting.entity.Meeting;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "segments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RealtimeSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "segment_id", nullable = false)
    private Long segmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @Column(name = "segment_seq", nullable = false)
    private Integer segmentSeq;

    @Lob
    @Column(name = "chunk_text", nullable = false, columnDefinition = "TEXT")
    private String chunkText;

    @Column(name = "start_time")
    private Integer startTime;

    @Column(name = "speaker_label", length = 50)
    private String speakerLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "embedding_status", nullable = false)
    @ColumnDefault("'PENDING'")
    private EmbeddingStatus embeddingStatus = EmbeddingStatus.PENDING;

    public RealtimeSegment(Meeting meeting, Integer segmentSeq, String chunkText, Integer startTime) {
        this.meeting = meeting;
        this.segmentSeq = segmentSeq;
        this.chunkText = chunkText;
        this.startTime = startTime;
        this.embeddingStatus = EmbeddingStatus.PENDING;
    }

    public void updateEmbeddingStatus(EmbeddingStatus status) {
        this.embeddingStatus = status;
    }
}
