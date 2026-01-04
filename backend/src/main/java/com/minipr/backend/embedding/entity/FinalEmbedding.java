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
    @org.hibernate.annotations.ColumnTransformer(read = "VECTOR_TO_STRING(embedding)", write = "STRING_TO_VECTOR(?)")
    private String embedding;

    public FinalEmbedding(FinalSegment finalSegment, String embedding) {
        this.finalSegment = finalSegment;
        this.embedding = embedding;
    }
}
