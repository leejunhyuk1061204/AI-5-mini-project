package com.minipr.backend.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 오디오 WebSocket 핸들러
 * 
 * Sliding Window 버퍼링 + 헤더 보존:
 * - 첫 청크(WebM 헤더)를 별도 저장
 * - 5개 청크 누적 시 [헤더 + 버퍼 청크들]로 완전한 WebM 생성
 * - Whisper API 호출
 */
@Slf4j
@RequiredArgsConstructor
public class AudioWebSocketHandler extends BinaryWebSocketHandler {

    private final WhisperApiClient whisperApiClient;

    // 버퍼 설정: 5초마다 Whisper 호출
    private static final int BUFFER_SIZE = 5;

    // 세션별 WebM 헤더 (첫 청크) 저장
    private final ConcurrentHashMap<String, byte[]> sessionHeaders = new ConcurrentHashMap<>();

    // 세션별 청크 버퍼 (2번째 청크부터 누적)
    private final ConcurrentHashMap<String, List<byte[]>> sessionBuffers = new ConcurrentHashMap<>();

    // 세션별 청크 카운터
    private final ConcurrentHashMap<String, Integer> chunkCounters = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        log.info("WebSocket 연결됨: sessionId={}", sessionId);
        sessionBuffers.put(sessionId, new ArrayList<>());
        chunkCounters.put(sessionId, 0);
        System.out.println("🔌 WebSocket 연결됨: " + sessionId);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        String sessionId = session.getId();
        byte[] audioData = message.getPayload().array();
        int chunkNumber = chunkCounters.getOrDefault(sessionId, 0) + 1;
        chunkCounters.put(sessionId, chunkNumber);

        System.out.println("========================================");
        System.out.println("🎤 청크 수신: #" + chunkNumber + " (" + audioData.length + " bytes)");

        // 첫 번째 청크 = WebM 헤더 저장
        if (chunkNumber == 1) {
            sessionHeaders.put(sessionId, audioData);
            System.out.println("   📌 첫 청크 - WebM 헤더로 저장됨");
            System.out.println("========================================");
            log.info("헤더 저장됨: sessionId={}, size={} bytes", sessionId, audioData.length);
            return; // 첫 청크는 버퍼에 넣지 않고 헤더로만 저장
        }

        // 버퍼에 청크 추가 (2번째 청크부터)
        List<byte[]> buffer = sessionBuffers.get(sessionId);
        if (buffer == null) {
            buffer = new ArrayList<>();
            sessionBuffers.put(sessionId, buffer);
        }
        buffer.add(audioData);

        System.out.println("   버퍼 현황: " + buffer.size() + "/" + BUFFER_SIZE + " 청크");

        // 버퍼가 가득 찼으면 Whisper 호출
        if (buffer.size() >= BUFFER_SIZE) {
            byte[] header = sessionHeaders.get(sessionId);
            if (header == null) {
                System.out.println("   ⚠️ 헤더 없음 - 스킵");
                System.out.println("========================================");
                return;
            }

            System.out.println("   🚀 버퍼 가득참! Whisper API 호출 중...");

            // [헤더 + 버퍼 청크들] = 완전한 WebM
            byte[] completeAudio = mergeHeaderAndChunks(header, buffer);
            System.out.println("   📦 [헤더 " + header.length + "B + 버퍼 " + getTotalSize(buffer) + "B] = "
                    + completeAudio.length + "B");

            // 버퍼 비우기
            buffer.clear();

            // Whisper API 호출 (비동기)
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
                                log.info("✅ Whisper 응답: text=\"{}\"", response.getText());
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

        log.info("오디오 청크 수신: sessionId={}, chunk={}, buffer={}/{}",
                sessionId, chunkNumber, buffer.size(), BUFFER_SIZE);
    }

    /**
     * 헤더와 청크들을 합쳐서 완전한 WebM 생성
     */
    private byte[] mergeHeaderAndChunks(byte[] header, List<byte[]> chunks) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        outputStream.write(header);
        for (byte[] chunk : chunks) {
            outputStream.write(chunk);
        }
        return outputStream.toByteArray();
    }

    /**
     * 청크 리스트의 총 바이트 수
     */
    private int getTotalSize(List<byte[]> chunks) {
        return chunks.stream().mapToInt(c -> c.length).sum();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = session.getId();

        // 남은 버퍼 처리 (마지막 청크들)
        List<byte[]> buffer = sessionBuffers.get(sessionId);
        byte[] header = sessionHeaders.get(sessionId);

        if (buffer != null && !buffer.isEmpty() && header != null) {
            System.out.println("🔚 연결 종료 - 남은 " + buffer.size() + "개 청크 처리 중...");
            byte[] completeAudio = mergeHeaderAndChunks(header, buffer);

            whisperApiClient.transcribe(completeAudio)
                    .subscribe(
                            response -> {
                                System.out.println("========================================");
                                System.out.println("✅ 마지막 Whisper 성공!");
                                System.out.println("📝 인식 결과: " + response.getText());
                                System.out.println("========================================");
                            },
                            error -> {
                                System.out.println("❌ 마지막 Whisper 실패: " + error.getMessage());
                            });
        }

        // 세션 정리
        sessionHeaders.remove(sessionId);
        sessionBuffers.remove(sessionId);
        chunkCounters.remove(sessionId);
        log.info("WebSocket 종료됨: sessionId={}, status={}", sessionId, status);
        System.out.println("🔌 WebSocket 종료됨: " + sessionId);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String sessionId = session.getId();
        sessionHeaders.remove(sessionId);
        sessionBuffers.remove(sessionId);
        chunkCounters.remove(sessionId);
        log.error("WebSocket 전송 오류: sessionId={}, error={}", sessionId, exception.getMessage());
    }
}
