package com.minipr.backend.meeting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateMeetingRequest(
                @NotNull Integer memberId,
                @NotBlank String title,
                String fullText) {
}
