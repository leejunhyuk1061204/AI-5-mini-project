package com.minipr.backend.embedding.repository;

import com.minipr.backend.embedding.entity.Embedding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmbeddingRepository extends JpaRepository<Embedding, Long> {

    Optional<Embedding> findBySegmentSegmentId(Long segmentId);
}
