package com.minipr.backend.meeting.dto;

public record DiarizationSegment(
        double start,
        double end,
        String speaker,
        String text) {
}
