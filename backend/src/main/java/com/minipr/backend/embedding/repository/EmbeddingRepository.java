package com.minipr.backend.embedding.repository;

import com.minipr.backend.embedding.entity.Embedding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmbeddingRepository extends JpaRepository<Embedding, Long> {
    List<Embedding> findByMeeting_MeetingId(Integer meetingId);
}
