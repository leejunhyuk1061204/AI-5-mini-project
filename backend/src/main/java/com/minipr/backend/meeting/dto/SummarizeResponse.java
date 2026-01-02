package com.minipr.backend.meeting.dto; 

import java.util.List;

public record SummarizeResponse(
        String description,
        List<String> core_summary,
        String meeting_type,
        List<String> topics,
        List<String> decisions,
        List<String> action_items,
        List<String> pending_items,
        String parse_error) {
}
