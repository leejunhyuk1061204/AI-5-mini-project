package com.minipr.backend.embedding.entity;

import com.minipr.backend.segment.entity.MeetingSegment;
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
    private MeetingSegment segment; // 1:1 관계 (세그먼트당 하나)

    /**
     * VECTOR(768) 타입은 Hibernate에서 직접 지원하지 않음
     * Native Query로 INSERT/SELECT 처리 필요
     * columnDefinition으로 DB 스키마에는 반영되도록 설정
     */
    @Column(name = "embedding", nullable = false, columnDefinition = "VECTOR(768)")
    private byte[] embedding; // VECTOR는 byte[]로 매핑 시도, 실제로는 native query 사용

    public Embedding(MeetingSegment segment, byte[] embedding) {
        this.segment = segment;
        this.embedding = embedding;
    }
}
