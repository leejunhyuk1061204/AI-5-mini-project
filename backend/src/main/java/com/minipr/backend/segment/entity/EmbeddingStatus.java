package com.minipr.backend.segment.entity;

/**
 * 세그먼트 임베딩 상태를 나타내는 ENUM (비동기 상태관리)
 */
public enum EmbeddingStatus {
    PENDING, // 대기 중
    SUCCESS, // 성공
    FAILED // 실패
}
