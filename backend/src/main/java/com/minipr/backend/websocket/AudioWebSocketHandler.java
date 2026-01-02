package com.minipr.backend.websocket;

import com.minipr.backend.segment.service.MeetingSegmentBufferService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;
import com.minipr.backend.service.FileStorageService;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RequiredArgsConstructor
public class AudioWebSocketHandler extends BinaryWebSocketHandler {

    private final WhisperApiClient whisperApiClient;
    private final MeetingSegmentBufferService meetingSegmentBufferService;
    private final FileStorageService fileStorageService;

    // TODO: 세션별 Meeting ID 관리 로직 필요 (현재는 임시 ID 1L 사용)
    private final Long currentMeetingId = 1L;

    private static final int BUFFER_SIZE = 5;

    private final ConcurrentHashMap<String, byte[]> sessionHeaders = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<byte[]>> sessionBuffers = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> chunkCounters = new ConcurrentHashMap<>();

    // 세션별 meetingId 저장
    private final ConcurrentHashMap<String, Integer> sessionMeetingIds = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();

        Integer meetingId = extractMeetingId(session);
        if (meetingId == null) {
            log.error("meetingId가 없음. 접속 URL에 ?meetingId= 형태로 보내야 함. sessionId={}", sessionId);
            session.close(CloseStatus.BAD_DATA);
            return;
        }
        sessionMeetingIds.put(sessionId, meetingId);

        log.info("WebSocket 연결됨: sessionId={}, meetingId={}", sessionId, meetingId);
        sessionBuffers.put(sessionId, new ArrayList<>());
        chunkCounters.put(sessionId, 0);
        System.out.println("🔌 WebSocket 연결됨: " + sessionId + " meetingId=" + meetingId);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        String sessionId = session.getId();
        Integer meetingId = sessionMeetingIds.get(sessionId);
        if (meetingId == null) {
            log.error("세션에 meetingId가 없음. sessionId={}", sessionId);
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        byte[] audioData = message.getPayload().array();

        // 1. 파일 시스템에 오디오 누적 저장 (Final 분석용)
        fileStorageService.appendAudio(Long.valueOf(meetingId), audioData);

        // 2. 실시간 버퍼링 및 Whisper 요청 로직 (기존 유지)
        int chunkNumber = chunkCounters.getOrDefault(sessionId, 0) + 1;
        chunkCounters.put(sessionId, chunkNumber);

        System.out.println("========================================");
        System.out.println("🎤 청크 수신: #" + chunkNumber + " (" + audioData.length + " bytes)");

        if (chunkNumber == 1) {
            sessionHeaders.put(sessionId, audioData);
            System.out.println("   📌 첫 청크 - WebM 헤더로 저장됨");
            System.out.println("========================================");
            log.info("헤더 저장됨: sessionId={}, size={} bytes", sessionId, audioData.length);
            return;
        }

        List<byte[]> buffer = sessionBuffers.computeIfAbsent(sessionId, k -> new ArrayList<>());
        buffer.add(audioData);

        System.out.println("   버퍼 현황: " + buffer.size() + "/" + BUFFER_SIZE + " 청크");

        if (buffer.size() >= BUFFER_SIZE) {
            byte[] header = sessionHeaders.get(sessionId);
            if (header == null) {
                System.out.println("   ⚠️ 헤더 없음 - 스킵");
                System.out.println("========================================");
                return;
            }

            System.out.println("   🚀 버퍼 가득참! Whisper API 호출 중...");

            byte[] completeAudio = mergeHeaderAndChunks(header, buffer);
            System.out.println("   📦 [헤더 " + header.length + "B + 버퍼 " + getTotalSize(buffer) + "B] = "
                    + completeAudio.length + "B");

            buffer.clear();

            final int currentChunk = chunkNumber;

            whisperApiClient.transcribe(completeAudio)
                    .subscribe(
                            response -> {
                                System.out.println("========================================");
                                System.out.println("✅ Whisper 성공! [청크 " + (currentChunk - BUFFER_SIZE + 1) + "~"
                                        + currentChunk + "]");
                                System.out.println("📝 인식 결과: " + response.getText());
                                System.out.println(
                                        "   언어: " + response.getLanguage() + ", 길이: " + response.getDuration() + "초");
                                System.out.println("========================================");

                                // 여기서 MeetingSegmentBufferService로 넘겨서 메모리 버퍼에 쌓기
                                String text = response.getText();
                                if (text != null && !text.isBlank()) {
                                    meetingSegmentBufferService.accept(meetingId, text, null, null);
                                }

                                log.info("✅ Whisper 응답 저장큐로 전달: meetingId={}, text=\"{}\"", meetingId,
                                        response.getText());
                            },
                            error -> {
                                System.out.println("========================================");
                                System.out.println("❌ Whisper 실패!");
                                System.out.println("   에러: " + error.getMessage());
                                System.out.println("========================================");
                                log.error("❌ Whisper API 오류: {}", error.getMessage());
                            });
        }

        System.out.println("========================================");
        log.info("오디오 청크 수신: sessionId={}, meetingId={}, chunk={}, buffer={}/{}",
                sessionId, meetingId, chunkNumber, buffer.size(), BUFFER_SIZE);
    }

    private byte[] mergeHeaderAndChunks(byte[] header, List<byte[]> chunks) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        outputStream.write(header);
        for (byte[] chunk : chunks)
            outputStream.write(chunk);
        return outputStream.toByteArray();
    }

    private int getTotalSize(List<byte[]> chunks) {
        return chunks.stream().mapToInt(c -> c.length).sum();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = session.getId();
        Integer meetingId = sessionMeetingIds.get(sessionId);

        List<byte[]> buffer = sessionBuffers.get(sessionId);
        byte[] header = sessionHeaders.get(sessionId);

        if (buffer != null && !buffer.isEmpty() && header != null && meetingId != null) {
            System.out.println("🔚 연결 종료 - 남은 " + buffer.size() + "개 청크 처리 중...");
            byte[] completeAudio = mergeHeaderAndChunks(header, buffer);

            whisperApiClient.transcribe(completeAudio)
                    .subscribe(
                            response -> {
                                System.out.println("========================================");
                                System.out.println("✅ 마지막 Whisper 성공!");
                                System.out.println("📝 인식 결과: " + response.getText());
                                System.out.println("========================================");

                                String text = response.getText();
                                if (text != null && !text.isBlank()) {
                                    meetingSegmentBufferService.accept(meetingId, text, null, null);
                                }
                            },
                            error -> System.out.println("❌ 마지막 Whisper 실패: " + error.getMessage()));
        }

        sessionHeaders.remove(sessionId);
        sessionBuffers.remove(sessionId);
        chunkCounters.remove(sessionId);
        sessionMeetingIds.remove(sessionId);

        log.info("WebSocket 종료됨: sessionId={}, meetingId={}, status={}", sessionId, meetingId, status);
        System.out.println("🔌 WebSocket 종료됨: " + sessionId);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String sessionId = session.getId();
        sessionHeaders.remove(sessionId);
        sessionBuffers.remove(sessionId);
        chunkCounters.remove(sessionId);
        sessionMeetingIds.remove(sessionId);
        log.error("WebSocket 전송 오류: sessionId={}, error={}", sessionId, exception.getMessage());
    }

    // ws://.../ws/audio?meetingId=123 에서 meetingId 꺼내기
    private Integer extractMeetingId(WebSocketSession session) {
        try {
            URI uri = session.getUri();
            if (uri == null || uri.getQuery() == null)
                return null;

            // query 예: meetingId=1&foo=bar
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
