package com.minipr.backend.embedding.repository;

import com.minipr.backend.embedding.entity.FinalEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FinalEmbeddingRepository extends JpaRepository<FinalEmbedding, Long> {

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO final_embeddings (final_segment_id, embedding) " +
            "VALUES (:segmentId, STRING_TO_VECTOR(:vectorStr)) " +
            "ON DUPLICATE KEY UPDATE embedding = STRING_TO_VECTOR(:vectorStr)", nativeQuery = true)
    void saveEmbedding(@Param("segmentId") Long segmentId, @Param("vectorStr") String vectorStr);

    Optional<FinalEmbedding> findByFinalSegment_Id(Long segmentId);

    List<FinalEmbedding> findAllByFinalSegment_Meeting_MeetingId(Integer meetingId);

    List<FinalEmbedding> findAllByFinalSegment_Meeting_Member_MemberId(Integer memberId);

    @Transactional
    void deleteByFinalSegment_Meeting_MeetingId(Integer meetingId);
}
