package com.minipr.backend.websocket;

import com.minipr.backend.common.event.MeetingSegmentSavedEvent;
import com.minipr.backend.meeting.entity.Meeting;
import com.minipr.backend.meeting.repository.MeetingRepository;
import com.minipr.backend.segment.entity.RealtimeSegment;
import com.minipr.backend.segment.repository.RealtimeSegmentRepository;
import com.minipr.backend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RequiredArgsConstructor
public class AudioWebSocketHandler extends BinaryWebSocketHandler {

    private final WhisperApiClient whisperApiClient;
    private final RealtimeSegmentRepository realtimeSegmentRepository;
    private final MeetingRepository meetingRepository;
    private final FileStorageService fileStorageService;
    private final ApplicationEventPublisher eventPublisher;

    private static final int BUFFER_SIZE = 5; // 5초 청크 (정확도 향상)

    private final ConcurrentHashMap<String, byte[]> sessionHeaders = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<byte[]>> sessionBuffers = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> chunkCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> sessionMeetingIds = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, MeetingSession> meetingSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        log.info("📡 [WebSocket] 연결 시도됨: sessionId={}, URI={}", sessionId, session.getUri());

        Integer meetingId = extractMeetingId(session);
        if (meetingId == null) {
            log.error("❌ [WebSocket] meetingId 추출 실패! sessionId={}, URI={}", sessionId, session.getUri());
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        // 미팅 존재 여부 확인 (간접적)
        try {
            meetingRepository.findById(meetingId).ifPresentOrElse(
                    m -> log.info("✅ [WebSocket] 미팅 확인됨: meetingId={}, title={}", meetingId, m.getTitle()),
                    () -> log.warn("⚠️ [WebSocket] DB에 미팅이 존재하지 않음! meetingId={}", meetingId));
        } catch (Exception e) {
            log.error("❌ [WebSocket] 미팅 조회 중 오류: {}", e.getMessage());
        }

        sessionMeetingIds.put(sessionId, meetingId);
        meetingSessions.put(sessionId, new MeetingSession());
        sessionBuffers.put(sessionId, new ArrayList<>());
        chunkCounters.put(sessionId, 0);

        log.info("🚀 [WebSocket] 연결 성공: sessionId={}, meetingId={}", sessionId, meetingId);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        String sessionId = session.getId();
        Integer meetingId = sessionMeetingIds.get(sessionId);
        if (meetingId == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        byte[] audioData = message.getPayload().array();
        log.debug("📥 [WebSocket] 데이터 수신: sessionId={}, size={} bytes", sessionId, audioData.length);

        // 1. File Storage for Final Analysis
        try {
            fileStorageService.appendAudio(Long.valueOf(meetingId), audioData);
        } catch (Exception e) {
            log.error("❌ [WebSocket] 파일 저장 실패: {}", e.getMessage());
        }

        // 2. Realtime Processing
        int chunkNumber = chunkCounters.getOrDefault(sessionId, 0) + 1;
        chunkCounters.put(sessionId, chunkNumber);

        if (chunkNumber == 1) {
            sessionHeaders.put(sessionId, audioData);
            return;
        }

        List<byte[]> buffer = sessionBuffers.computeIfAbsent(sessionId, k -> new ArrayList<>());
        buffer.add(audioData);

        if (buffer.size() >= BUFFER_SIZE) {
            byte[] header = sessionHeaders.get(sessionId);
            if (header == null)
                return;

            byte[] completeAudio = mergeHeaderAndChunks(header, buffer);
            buffer.clear();

            whisperApiClient.transcribe(completeAudio)
                    .subscribe(
                            response -> {
                                log.info("Whisper Result: {}", response.getText());
                                processTranscription(sessionId, meetingId, response.getText());
                            },
                            error -> log.error("Whisper Error: {}", error.getMessage()));
        }
    }

    private void processTranscription(String sessionId, Integer meetingId, String text) {
        MeetingSession meetingSession = meetingSessions.get(sessionId);
        if (meetingSession == null)
            return;

        if (text != null && !text.isBlank()) {
            meetingSession.addText(text);
        }

        // Check for triggers (Delimiter, Size, Idleness)
        // 텍스트가 빈 경우에도 시간 기반(Idleness) 체크를 위해 shouldSplit 호출
        boolean isSilence = false; // Placeholder for VAD

        if (meetingSession.shouldSplit(isSilence)) {
            String segmentText = meetingSession.popSegment(true);
            saveSegment(meetingId, meetingSession.getSegmentSeq(), segmentText, meetingSession.getCurrentMeetingTime());
        }
    }

    private void saveSegment(Integer meetingId, int segmentSeq, String text, int startTime) {
        if (text == null || text.trim().isBlank()) {
            return;
        }
        try {
            Meeting meeting = meetingRepository.getReferenceById(meetingId);
            RealtimeSegment segment = new RealtimeSegment(meeting, segmentSeq, text.trim(), startTime);
            realtimeSegmentRepository.save(segment);
            eventPublisher.publishEvent(new MeetingSegmentSavedEvent(segment));
            log.info("🎯 [Segment] 저장 완료: meetingId={}, seq={}, text='{}'", meetingId, segmentSeq, text.trim());
        } catch (Exception e) {
            log.error("❌ [Segment] 저장 실패: meetingId={}, error={}", meetingId, e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = session.getId();
        Integer meetingId = sessionMeetingIds.get(sessionId);
        log.info("🔌 [WebSocket] 연결 종료됨: sessionId={}, meetingId={}", sessionId, meetingId);

        List<byte[]> buffer = sessionBuffers.get(sessionId);
        byte[] header = sessionHeaders.get(sessionId);

        if (meetingId != null && buffer != null && !buffer.isEmpty() && header != null) {
            log.info("🧹 [WebSocket] 남은 오디오 데이터 처리 중... (size={})", buffer.size());
            // 마지막 부분은 동기적으로 처리하여 데이터 유실 방지
            try {
                byte[] completeAudio = mergeHeaderAndChunks(header, buffer);
                TranscribeResponse response = whisperApiClient.transcribe(completeAudio).block();
                if (response != null && response.getText() != null) {
                    processTranscription(sessionId, meetingId, response.getText());
                }

                // 최종 남은 텍스트 강제 플러시
                flushRemainingText(sessionId, meetingId);
            } catch (Exception e) {
                log.error("❌ [WebSocket] 종료 시 처리 실패: {}", e.getMessage());
            }
        } else if (meetingId != null) {
            flushRemainingText(sessionId, meetingId);
        }

        cleanup(sessionId);
    }

    private void flushRemainingText(String sessionId, Integer meetingId) {
        MeetingSession ms = meetingSessions.get(sessionId);
        if (ms != null) {
            String remaining = ms.popSegment(false);
            if (remaining != null && !remaining.trim().isBlank()) {
                log.info("🧹 [WebSocket] 최종 텍스트 플러시 중... (text='{}')", remaining.trim());
                saveSegment(meetingId, ms.getSegmentSeq(), remaining, ms.getCurrentMeetingTime());
            }
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        cleanup(session.getId());
        log.error("WebSocket Error: sessionId={}, error={}", session.getId(), exception.getMessage());
    }

    private void cleanup(String sessionId) {
        sessionHeaders.remove(sessionId);
        sessionBuffers.remove(sessionId);
        chunkCounters.remove(sessionId);
        sessionMeetingIds.remove(sessionId);
        meetingSessions.remove(sessionId);
    }

    private byte[] mergeHeaderAndChunks(byte[] header, List<byte[]> chunks) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        outputStream.write(header);
        for (byte[] chunk : chunks)
            outputStream.write(chunk);
        return outputStream.toByteArray();
    }

    private Integer extractMeetingId(WebSocketSession session) {
        try {
            URI uri = session.getUri();
            if (uri == null || uri.getQuery() == null)
                return null;
            for (String part : uri.getQuery().split("&")) {
                String[] kv = part.split("=");
                if (kv.length == 2 && kv[0].equals("meetingId")) {
                    return Integer.parseInt(kv[1]);
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
