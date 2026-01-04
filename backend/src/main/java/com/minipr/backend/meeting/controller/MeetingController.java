package com.minipr.backend.meeting.controller;

import com.minipr.backend.common.ApiResponse;
import com.minipr.backend.meeting.dto.CreateMeetingRequest;
import com.minipr.backend.meeting.dto.MeetingResponse;
import com.minipr.backend.meeting.entity.Meeting;
import com.minipr.backend.meeting.service.MeetingService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
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

    @PostMapping("/upload")
    public ApiResponse<MeetingResponse> upload(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("memberId") Integer memberId) {

        java.nio.file.Path tempFile = null;
        try {
            // 1. 회의 생성
            CreateMeetingRequest req = new CreateMeetingRequest(memberId, title, "");
            Meeting meeting = meetingService.create(req);
            log.info("📝 [Upload] 회의 생성 완료: meetingId={}, title={}", meeting.getMeetingId(), title);

            // 2. 임시 파일에 저장 (분석 후 삭제 예정)
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".webm";
            tempFile = java.nio.file.Files.createTempFile("meeting_upload_", extension);
            file.transferTo(tempFile);
            log.info("📁 [Upload] 임시 파일 저장: {}", tempFile);

            // 3. 분석 요청 (기존 메커니즘 재사용)
            Meeting result = meetingService.endMeeting(meeting.getMeetingId(), tempFile.toFile());
            log.info("✅ [Upload] 분석 완료: meetingId={}, status={}", result.getMeetingId(), result.getStatus());

            return ApiResponse.ok(MeetingResponse.from(result));

        } catch (Exception e) {
            log.error("❌ [Upload] 업로드/분석 실패: {}", e.getMessage(), e);
            throw new RuntimeException("Upload failed: " + e.getMessage(), e);
        } finally {
            // 4. 임시 파일 삭제
            if (tempFile != null) {
                try {
                    java.nio.file.Files.deleteIfExists(tempFile);
                    log.info("🗑️ [Upload] 임시 파일 삭제 완료: {}", tempFile);
                } catch (java.io.IOException deleteEx) {
                    log.warn("⚠️ [Upload] 임시 파일 삭제 실패: {}", deleteEx.getMessage());
                }
            }
        }
    }

    @PostMapping("/{meetingId}/retry")
    public ApiResponse<MeetingResponse> retry(@PathVariable Integer meetingId) {
        try {
            log.info("🔄 [Retry] 분석 재시도 요청: meetingId={}", meetingId);
            Meeting result = meetingService.retryAnalysis(meetingId);
            log.info("✅ [Retry] 분석 재시도 완료: meetingId={}, status={}", result.getMeetingId(), result.getStatus());
            return ApiResponse.ok(MeetingResponse.from(result));
        } catch (Exception e) {
            log.error("❌ [Retry] 재시도 실패: {}", e.getMessage(), e);
            throw new RuntimeException("Retry failed: " + e.getMessage(), e);
        }
    }

    @PostMapping("/{meetingId}/fast-summary")
    public ApiResponse<MeetingResponse> fastSummary(@PathVariable Integer meetingId) {
        try {
            log.info("⚡ [FastSummary] 빠른 요약 요청: meetingId={}", meetingId);
            Meeting result = meetingService.summarizeFast(meetingId);
            log.info("✅ [FastSummary] 빠른 요약 완료: meetingId={}", meetingId);
            return ApiResponse.ok(MeetingResponse.from(result));
        } catch (Exception e) {
            log.error("❌ [FastSummary] 빠른 요약 실패: {}", e.getMessage(), e);
            throw new RuntimeException("Fast summary failed: " + e.getMessage(), e);
        }
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

    @DeleteMapping("/{meetingId}")
    public ApiResponse<Void> delete(@PathVariable Integer meetingId) {
        meetingService.delete(meetingId);
        return ApiResponse.ok(null);
    }
}
