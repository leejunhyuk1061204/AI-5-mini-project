package com.minipr.backend.segment.service;

import com.minipr.backend.meeting.entity.Meeting;
import com.minipr.backend.meeting.repository.MeetingRepository;
import com.minipr.backend.segment.entity.MeetingSegment;
import com.minipr.backend.segment.repository.MeetingSegmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class MeetingSegmentBufferService {

    private final MeetingSegmentRepository segmentRepository;
    private final MeetingRepository meetingRepository;

    private final int capacityPerMeeting;
    private final int batchSize;

    private final Map<Integer, MeetingBuffer> buffers = new ConcurrentHashMap<>();

    public MeetingSegmentBufferService(
            MeetingSegmentRepository segmentRepository,
            MeetingRepository meetingRepository,
            @Value("${buffer.window-size:1000}") int windowSize,
            @Value("${buffer.overhead-ratio:0.3}") double overheadRatio,
            @Value("${buffer.flush.batch-size:200}") int batchSize
    ) {
        this.segmentRepository = segmentRepository;
        this.meetingRepository = meetingRepository;
        this.capacityPerMeeting = (int) Math.ceil(windowSize * (1.0 + overheadRatio));
        this.batchSize = batchSize;
    }

    /**
     * WebSocketHandler 등에서 호출:
     *  - meetingId에 해당하는 회의에 텍스트 조각을 추가
     *  - segmentSeq는 회의별로 자동 증가
     */
    public void accept(Integer meetingId, String chunkText, Integer startTime, String speakerLabel) {
        MeetingBuffer mb = buffers.computeIfAbsent(meetingId, id -> new MeetingBuffer(capacityPerMeeting));

        int nextSeq = mb.seq.incrementAndGet();

        mb.buffer.add(new SegmentDraft(meetingId, nextSeq, chunkText, startTime, speakerLabel));
    }

    public void accept(Long meetingId, String chunkText, Integer startTime, String speakerLabel) {
        if (meetingId == null) return;
        accept(meetingId.intValue(), chunkText, startTime, speakerLabel);
    }

    /**
     * 주기적으로 모든 회의 버퍼에서 batchSize 만큼 꺼내 DB 저장
     */
    @Scheduled(fixedDelayString = "${buffer.flush.interval-ms:1000}")
    @Transactional
    public void flushAllMeetings() {
        List<SegmentDraft> drafts = new ArrayList<>(batchSize);

        for (MeetingBuffer mb : buffers.values()) {
            if (drafts.size() >= batchSize) break;

            int remaining = batchSize - drafts.size();
            drafts.addAll(mb.buffer.drain(remaining));
        }

        if (drafts.isEmpty()) return;

        Map<Integer, Meeting> meetingRefCache = new HashMap<>();

        List<MeetingSegment> toSave = new ArrayList<>(drafts.size());
        for (SegmentDraft d : drafts) {
            Meeting meetingRef = meetingRefCache.computeIfAbsent(
                    d.meetingId(),
                    meetingRepository::getReferenceById 
            );

            MeetingSegment seg = (d.startTime() == null && d.speakerLabel() == null)
                    ? new MeetingSegment(meetingRef, d.segmentSeq(), d.chunkText())
                    : new MeetingSegment(meetingRef, d.segmentSeq(), d.chunkText(), d.startTime(), d.speakerLabel());

            toSave.add(seg);
        }

        segmentRepository.saveAll(toSave);
    }

    // 버퍼 내부에서 들고 있을 "가벼운 데이터"
    private record SegmentDraft(
            Integer meetingId,
            Integer segmentSeq,
            String chunkText,
            Integer startTime,
            String speakerLabel
    ) {}

    private static class MeetingBuffer {
        final SlidingWindowBuffer<SegmentDraft> buffer;
        final AtomicInteger seq = new AtomicInteger(0);

        MeetingBuffer(int capacity) {
            this.buffer = new SlidingWindowBuffer<>(capacity);
        }
    }
}
