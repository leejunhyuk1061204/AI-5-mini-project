package com.minipr.backend.websocket;

import lombok.Getter;

@Getter
public class MeetingSession {
    private final StringBuilder buffer = new StringBuilder();
    private long lastActiveTime = System.currentTimeMillis();
    private int segmentSeq = 0;
    private final long startTimeMillis;

    public MeetingSession() {
        this.startTimeMillis = System.currentTimeMillis();
    }

    private String lastProcessedFullText = ""; // Whisper가 반환한 전체 누적 텍스트의 마지막 상태

    public void addText(String text) {
        if (text == null || text.isBlank())
            return;

        buffer.append(text).append(" ");
        lastActiveTime = System.currentTimeMillis();
    }

    /**
     * Whisper로부터 받은 누적 전체 텍스트를 기반으로 버퍼를 업데이트합니다.
     * 이미 세그먼트화되어 나간 텍스트와 겹치는 부분을 지능적으로 식별하여 새 텍스트만 유지합니다.
     */
    public void updateWithCumulativeText(String fullText) {
        if (fullText == null || fullText.isBlank())
            return;

        // 1. 단순화된 전략: fullText에서 이전에 처리했던 부분을 찾아 그 이후만 취함
        // (Whisper는 문맥에 따라 이전 텍스트를 조금씩 수정할 수 있으므로 완벽한 매칭이 아닐 수 있음)

        String newPart = fullText;
        if (!lastProcessedFullText.isEmpty() && fullText.startsWith(lastProcessedFullText)) {
            newPart = fullText.substring(lastProcessedFullText.length());
        } else if (!lastProcessedFullText.isEmpty()) {
            // 접두어 매칭이 안 될 경우 (Whisper가 이전 문장을 수정한 경우),
            // 가장 긴 공통 접두어를 찾거나 하는 복잡한 로직 대신
            // 현재 버퍼의 끝부분과 매칭되는 지점을 찾을 수도 있음.
            // 일단은 단순화를 위해 fullText를 그대로 사용하되 addText가 아닌 '덮어쓰기' 느낌으로 처리
            newPart = findNewPart(lastProcessedFullText, fullText);
        }

        if (!newPart.isBlank()) {
            String filtered = applyFilters(newPart.trim());
            if (!filtered.isBlank()) {
                addText(filtered);
            }
            lastProcessedFullText = fullText;
        }
    }

    private String applyFilters(String text) {
        String filtered = text;

        // 1. 기술 용어 오인식 교정
        filtered = filtered.replace("박백업", "백엔드")
                .replace("빽엔드", "백엔드")
                .replace("데이터 베이스", "데이터베이스")
                .replace("자바 스크립트", "자바스크립트");

        // 2. Whisper 반복 문구 제거
        if (filtered.length() > 10) {
            String mid = filtered.substring(0, filtered.length() / 2);
            if (filtered.endsWith(mid + mid)) {
                return mid;
            }
        }

        // 3. 환각 방지
        if (filtered.matches("^[\\.\\?\\!\\s]+$")) {
            return "";
        }

        return filtered;
    }

    private String findNewPart(String oldText, String newText) {
        // 간단한 겹침 제거 알고리즘 (문장 끝부분 매칭)
        int minLen = Math.min(oldText.length(), newText.length());
        for (int i = Math.min(minLen, 50); i > 0; i--) { // 최대 50자 정도 겹침 확인
            String tail = oldText.substring(oldText.length() - i);
            if (newText.startsWith(tail)) {
                return newText.substring(i);
            }
        }
        return newText;
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
        int adjustedOverlapStart = fullText.lastIndexOf(' ', overlapStartIndex);
        if (adjustedOverlapStart == -1 || adjustedOverlapStart == 0) {
            adjustedOverlapStart = overlapStartIndex;
        } else {
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
