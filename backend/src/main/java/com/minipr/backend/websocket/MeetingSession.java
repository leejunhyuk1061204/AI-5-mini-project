package com.minipr.backend.websocket;

import lombok.Getter;
import java.time.Instant;

@Getter
public class MeetingSession {
    private final StringBuilder buffer = new StringBuilder();
    private long lastActiveTime = System.currentTimeMillis();
    private int segmentSeq = 0;
    private final long startTimeMillis;

    public MeetingSession() {
        this.startTimeMillis = System.currentTimeMillis();
    }

    public void addText(String text) {
        if (text == null || text.isBlank())
            return;

        buffer.append(text).append(" ");
        lastActiveTime = System.currentTimeMillis();
    }

    public boolean shouldSplit(boolean isSilenceDetected) {
        int length = buffer.length();
        if (length == 0)
            return false;

        // 1. Size Trigger (Safety) - 500자 넘으면 무조건 자름
        if (length > 500)
            return true;

        // 2. Delimiter Trigger - 문장 종료 부호가 있고 어느 정도 길이가 되면 자름 (기존 50 -> 20으로 하향 조정)
        if (length > 20) {
            char lastChar = buffer.charAt(buffer.length() - 1);
            if (isDelimiter(lastChar))
                return true;

            // 공백이 붙어있는 경우를 고려하여 마지막에서 두 번째 문자도 확인
            if (buffer.length() >= 2) {
                char secondLast = buffer.charAt(buffer.length() - 2);
                if (isDelimiter(secondLast))
                    return true;
            }
        }

        // 3. Time Trigger (Idleness) - 5초 이상 입력이 없고 내용이 있으면 자름 (기존 10자 -> 3자 하향조정)
        long now = System.currentTimeMillis();
        if ((now - lastActiveTime > 5000) && length >= 3) {
            return true;
        }

        return false;
    }

    private boolean isDelimiter(char c) {
        return c == '.' || c == '?' || c == '!' || c == '\n';
    }

    public String splitAndGetSegmentText() {
        String fullText = buffer.toString();
        int splitIndex = fullText.length();

        // Smart Split: If splitting due to size, find nearest space
        if (fullText.length() > 500) {
            splitIndex = fullText.lastIndexOf(' ', 500);
            if (splitIndex == -1)
                splitIndex = 500;
        }

        // Actually we just return the whole buffer content usually,
        // but for sliding window, we need to keep 30%.

        return fullText;
    }

    public String popSegment(boolean keepOverlap) {
        String fullText = buffer.toString();
        int originalLength = fullText.length();

        // Output text is currently everything
        String outputText = fullText;

        // Calculate Overlap
        int overlapLength = (int) (originalLength * 0.3);
        int overlapStartIndex = originalLength - overlapLength;

        // Adjust overlap start to nearest space to avoid cutting words
        // Use lastIndexOf to find space BEFORE the overlap start (so we don't cut a
        // word)
        int adjustedOverlapStart = fullText.lastIndexOf(' ', overlapStartIndex);
        if (adjustedOverlapStart == -1 || adjustedOverlapStart == 0) {
            // fallback if no space found before overlap start
            adjustedOverlapStart = overlapStartIndex;
        } else {
            // Move past the space itself
            adjustedOverlapStart = adjustedOverlapStart + 1;
        }

        String overlapText = "";
        if (keepOverlap && adjustedOverlapStart < originalLength) {
            overlapText = fullText.substring(adjustedOverlapStart).trim();
        }

        // Reset buffer with overlap
        buffer.setLength(0);
        if (!overlapText.isEmpty()) {
            buffer.append(overlapText).append(" ");
        }

        segmentSeq++;
        return outputText;
    }

    public int getCurrentMeetingTime() {
        return (int) ((System.currentTimeMillis() - startTimeMillis) / 1000);
    }
}
