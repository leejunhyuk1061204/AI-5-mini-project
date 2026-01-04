package com.minipr.backend.meeting.entity;

/**
 * 회의 상태를 나타내는 ENUM (비동기 제어용)
 */
public enum MeetingStatus {
    PROCEEDING, // 진행 중
    RECORDED, // 녹음 완료 (분석 전)
    COMPLETED, // 완료됨
    ANALYZING, // 분석 중
    FAILED // 실패
}
