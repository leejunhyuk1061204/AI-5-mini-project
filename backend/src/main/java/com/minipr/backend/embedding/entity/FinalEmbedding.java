package com.minipr.backend.embedding.entity;

import com.minipr.backend.segment.entity.FinalSegment;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * FinalSegment에 대한 벡터 임베딩 데이터
 */
@Entity
@Table(name = "final_embeddings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FinalEmbedding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "final_embedding_id", nullable = false)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "final_segment_id", nullable = false, unique = true)
    private FinalSegment finalSegment;

    @Column(name = "embedding", nullable = false, columnDefinition = "VECTOR(768)")
    private byte[] vectorData;

    public FinalEmbedding(FinalSegment finalSegment, byte[] vectorData) {
        this.finalSegment = finalSegment;
        this.vectorData = vectorData;
    }
}
