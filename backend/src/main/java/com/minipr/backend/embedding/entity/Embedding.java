package com.minipr.backend.embedding.entity;

import com.minipr.backend.meeting.entity.Meeting;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "embeddings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Embedding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "embedding_id", nullable = false)
    private Long embeddingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @Lob
    @Column(name = "chunk_text", nullable = false, columnDefinition = "LONGTEXT")
    private String chunkText;

    // vector(768)은 2단계에서 native query로 처리 추천
    @Transient
    private Object embeddingVector;

    public Embedding(Meeting meeting, String chunkText) {
        this.meeting = meeting;
        this.chunkText = chunkText;
    }
}
