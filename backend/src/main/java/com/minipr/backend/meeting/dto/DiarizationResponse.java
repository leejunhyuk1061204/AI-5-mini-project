package com.minipr.backend.meeting.dto;

import java.util.List;

public record DiarizationResponse(
        List<DiarizationSegment> segments,
        int count,
        int took_ms) {
}
