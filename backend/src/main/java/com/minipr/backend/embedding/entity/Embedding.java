package com.minipr.backend.embedding.entity;

import com.minipr.backend.segment.entity.RealtimeSegment;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Embedding 엔티티 - Segment와 1:1 관계
 * MySQL 9.5의 VECTOR(768) 타입 사용
 */
@Entity
@Table(name = "embeddings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Embedding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "embedding_id", nullable = false)
    private Long embeddingId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "segment_id", nullable = false, unique = true)
    private RealtimeSegment segment; // 1:1 관계 (세그먼트당 하나)

    /**
     * 범용성을 위해 벡터를 JSON 문자열 형태로 저장 (예: "[0.1, 0.2, ...]")
     * MySQL 9.5의 VECTOR 타입을 처리하기 위해 ColumnTransformer 사용
     */
    @Column(name = "embedding", nullable = false, columnDefinition = "VECTOR(768)")
    @org.hibernate.annotations.ColumnTransformer(read = "VECTOR_TO_STRING(embedding)", write = "STRING_TO_VECTOR(?)")
    private String embedding; // Java에서는 JSON String으로 다루지만 DB에는 VECTOR로 저장됨

    public Embedding(RealtimeSegment segment, String embedding) {
        this.segment = segment;
        this.embedding = embedding;
    }
}
