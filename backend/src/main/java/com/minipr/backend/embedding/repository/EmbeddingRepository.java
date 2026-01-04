package com.minipr.backend.embedding.repository;

import com.minipr.backend.embedding.entity.Embedding;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmbeddingRepository extends JpaRepository<Embedding, Long> {

        Optional<Embedding> findBySegmentSegmentId(Long segmentId);

        // findSimilarSegments 제거됨 - MySQL CE에 DISTANCE 함수 없음
        // 대신 findAllBySegmentMeetingId 사용 후 Java에서 거리 계산

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query(value = "INSERT INTO embeddings (segment_id, embedding) VALUES (:segmentId, STRING_TO_VECTOR(:vectorString))", nativeQuery = true)
        void insertWithVector(@Param("segmentId") Long segmentId, @Param("vectorString") String vectorString);

        @Query("SELECT e FROM Embedding e JOIN FETCH e.segment s WHERE s.meeting.meetingId = :meetingId")
        List<Embedding> findAllBySegmentMeetingId(@Param("meetingId") Integer meetingId);
}
