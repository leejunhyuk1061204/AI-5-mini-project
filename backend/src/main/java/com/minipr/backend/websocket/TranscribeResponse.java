package com.minipr.backend.websocket;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Whisper API 응답 DTO
 */
@Data
@NoArgsConstructor
public class TranscribeResponse {

    private String text;

    private String language;

    private double duration;

    @JsonProperty("took_ms")
    private int tookMs;
}
