package com.minipr.backend.meeting.controller;

import com.minipr.backend.common.ApiResponse;
import com.minipr.backend.meeting.dto.CreateMeetingRequest;
import com.minipr.backend.meeting.dto.MeetingResponse;
import com.minipr.backend.meeting.entity.Meeting;
import com.minipr.backend.meeting.service.MeetingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meetings")
public class MeetingController {

    private final MeetingService meetingService;

    public MeetingController(MeetingService meetingService) {
        this.meetingService = meetingService;
    }

    @PostMapping
    public ApiResponse<MeetingResponse> create(@Valid @RequestBody CreateMeetingRequest req) {
        Meeting saved = meetingService.create(req);
        return ApiResponse.ok(MeetingResponse.from(saved));
    }

    @GetMapping("/{meetingId}")
    public ApiResponse<MeetingResponse> get(@PathVariable Integer meetingId) {
        return ApiResponse.ok(MeetingResponse.from(meetingService.get(meetingId)));
    }

    @GetMapping
    public ApiResponse<List<MeetingResponse>> listByMember(@RequestParam Integer memberId) {
        List<MeetingResponse> result = meetingService.listByMember(memberId).stream()
                .map(MeetingResponse::from)
                .toList();
        return ApiResponse.ok(result);
    }
}
