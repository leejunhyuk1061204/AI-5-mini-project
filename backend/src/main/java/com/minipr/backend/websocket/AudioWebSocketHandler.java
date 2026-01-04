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
    private final com.minipr.backend.meeting.service.MeetingService meetingService; // Injected
    private final ApplicationEventPublisher eventPublisher;

    private static final int BUFFER_SIZE = 5; // 5초마다 API 호출
    private static final int MAX_RT_BUFFER_SIZE = 15; // 실시간 인식용 최대 버퍼 (15초)

    private final ConcurrentHashMap<String, byte[]> sessionHeaders = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<byte[]>> sessionBuffers = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> chunkCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> sessionMeetingIds = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, MeetingSession> meetingSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        // log.info("📡 [WebSocket] 연결 시도됨: sessionId={}, URI={}", sessionId,
        // session.getUri()); // Too verbose

        Integer meetingId = extractMeetingId(session);
        if (meetingId == null) {
            log.error("❌ [WebSocket] meetingId 추출 실패! sessionId={}", sessionId);
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        sessionMeetingIds.put(sessionId, meetingId);
        meetingSessions.put(sessionId, new MeetingSession());
        sessionBuffers.put(sessionId, new ArrayList<>());
        chunkCounters.put(sessionId, 0);

        log.info("🚀 [WebSocket] 연결 성공: sessionId={}, meetingId={}", sessionId, meetingId);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        try {
            String sessionId = session.getId();
            Integer meetingId = sessionMeetingIds.get(sessionId);
            if (meetingId == null) {
                session.close(CloseStatus.BAD_DATA);
                return;
            }

            byte[] audioData = message.getPayload().array();

            // 2. Realtime Processing - 청크 번호 먼저 계산
            int chunkNumber = chunkCounters.getOrDefault(sessionId, 0) + 1;
            chunkCounters.put(sessionId, chunkNumber);

            // 1. File Storage for Final Analysis (모든 청크를 저장 - 헤더 포함)
            try {
                fileStorageService.appendAudio(Long.valueOf(meetingId), audioData);
                if (chunkNumber == 1) {
                    log.info("📁 [FileStorage] WebM 헤더 저장됨: meetingId={}, size={}bytes", meetingId, audioData.length);
                }
            } catch (Exception e) {
                // 파일 저장 실패는 치명적이지 않으므로 로그만 남기고 계속 진행 (실시간 자막은 나와야 함)
                log.error("❌ [WebSocket] 파일 저장 실패: {}", e.getMessage());
            }

            // 첫 번째 청크는 헤더이므로 따로 저장하고 리턴
            if (chunkNumber == 1) {
                sessionHeaders.put(sessionId, audioData);
                return;
            }

            List<byte[]> buffer = sessionBuffers.computeIfAbsent(sessionId, k -> new ArrayList<>());
            buffer.add(audioData);

            // [SLIDING WINDOW] 실시간 인식용 버퍼 크기 제한 (최근 15초만 유지)
            if (buffer.size() > MAX_RT_BUFFER_SIZE) {
                buffer.remove(0); // 가장 오래된 1초 청크 제거
            }

            // BUFFER_SIZE(5개)마다 처리하되, 헤더 + 슬라이딩 윈도우 버퍼 전송
            if (buffer.size() % BUFFER_SIZE == 0) {
                byte[] header = sessionHeaders.get(sessionId);
                if (header == null)
                    return;

                byte[] rollingAudio = mergeHeaderAndChunks(header, buffer);

                whisperApiClient.transcribe(rollingAudio)
                        .subscribe(
                                response -> {
                                    String transText = response.getText();
                                    if (transText != null && !transText.isBlank()) {
                                        log.info("📡 [Whisper] Recog: {}",
                                                transText.length() > 50 ? transText.substring(0, 50) + "..."
                                                        : transText);
                                    }
                                    processTranscription(sessionId, meetingId, transText);
                                },
                                error -> log.error("❌ [Whisper] Error: {}", error.getMessage()));
            }
        } catch (Exception e) {
            log.error("❌ [WebSocket] 처리 중 예기치 않은 오류: {}", e.getMessage(), e);
            // 에러가 나도 세션을 닫지 않고 클라이언트가 계속 보낼 수 있게 함
        }
    }

    private void processTranscription(String sessionId, Integer meetingId, String text) {
        MeetingSession meetingSession = meetingSessions.get(sessionId);
        if (meetingSession == null || text == null || text.isBlank())
            return;

        // 누적 전송의 경우, 이전에 인식된 부분은 제외하고 새로운 부분만 추가해야 함
        meetingSession.updateWithCumulativeText(text);

        // Split trigger 체크
        if (meetingSession.shouldSplit(false)) {
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

        // 1. 남은 버퍼 처리
        if (meetingId != null && buffer != null && !buffer.isEmpty() && header != null) {
            log.info("🧹 [WebSocket] 남은 오디오 데이터 처리 중... (size={})", buffer.size());
            try {
                byte[] completeAudio = mergeHeaderAndChunks(header, buffer);
                TranscribeResponse response = whisperApiClient.transcribe(completeAudio).block();
                if (response != null && response.getText() != null) {
                    processTranscription(sessionId, meetingId, response.getText());
                }
            } catch (Exception e) {
                log.error("❌ [WebSocket] 종료 시 처리 실패: {}", e.getMessage());
            }
        }

        // 2. 최종 텍스트 플러시
        if (meetingId != null) {
            flushRemainingText(sessionId, meetingId);

            // 3. [DEFERRED] 화자 분리 및 최종 정리는 이제 사용자가 수동으로 트리거함
            log.info("🏁 [Meeting] 녹음 종료: meetingId={} (수동 분석 대기 중)", meetingId);
            try {
                meetingService.updateStatus(meetingId, com.minipr.backend.meeting.entity.MeetingStatus.RECORDED);
                log.info("✅ [Meeting] 상태 변경 완료: RECORDED");
            } catch (Exception e) {
                log.error("❌ [Meeting] 상태 변경 실패: {}", e.getMessage());
            }
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
