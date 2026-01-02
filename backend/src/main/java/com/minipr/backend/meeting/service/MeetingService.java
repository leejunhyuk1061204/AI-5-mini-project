package com.minipr.backend.meeting.service;

import com.minipr.backend.common.NotFoundException;
import com.minipr.backend.meeting.dto.*;
import com.minipr.backend.meeting.entity.Meeting;
import com.minipr.backend.meeting.entity.MeetingStatus;
import com.minipr.backend.meeting.repository.MeetingRepository;
import com.minipr.backend.member.entity.Member;
import com.minipr.backend.member.service.MemberService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.File;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MemberService memberService;
    private final WebClient webClient;

    public MeetingService(MeetingRepository meetingRepository,
            MemberService memberService,
            WebClient.Builder webClientBuilder,
            @Value("${python.ai.url:http://localhost:8000}") String pythonAiUrl) {
        this.meetingRepository = meetingRepository;
        this.memberService = memberService;
        this.webClient = webClientBuilder.baseUrl(pythonAiUrl).build();
    }

    public Meeting create(CreateMeetingRequest req) {
        Member member = memberService.get(req.memberId());
        Meeting meeting = new Meeting(member, req.title(), req.fullText());
        return meetingRepository.save(meeting);
    }

    @Transactional(readOnly = true)
    public Meeting get(Integer meetingId) {
        return meetingRepository.findById(meetingId)
                .orElseThrow(() -> new NotFoundException("회의록이 없습니다. meetingId=" + meetingId));
    }

    @Transactional(readOnly = true)
    public List<Meeting> listByMember(Integer memberId) {
        return meetingRepository.findByMember_MemberId(memberId);
    }

    /**
     * 회의 종료: 화자 분리 및 정밀 전사 수행 후 full_text 업데이트
     */
    @Transactional
    public Meeting endMeeting(Integer meetingId, File audioFile) {
        Meeting meeting = get(meetingId);

        // 1. 상태 변경 (분석 중)
        meeting.updateStatus(MeetingStatus.ANALYZING);

        // 2. Python AI 서버 호출: 화자 분리 + 정밀 전사 (Whisper)
        DiarizationResponse aiResponse = callDiarizeAndTranscribe(audioFile);

        // 3. 분석 결과 포맷팅 ([Speaker A]: 텍스트)
        String fullText = aiResponse.segments().stream()
                .map(s -> "[" + s.speaker() + "]: " + s.text())
                .collect(Collectors.joining("\n"));

        // 4. Meeting 엔티티의 full_text 업데이트
        meeting.updateFullText(fullText);

        // 5. 요약 API 호출 및 저장
        SummarizeResponse summaryResponse = callSummarizeApi(fullText);
        meeting.updateSummary(formatSummary(summaryResponse));

        // 6. 상태 변경 (완료)
        meeting.updateStatus(MeetingStatus.COMPLETED);

        return meetingRepository.save(meeting);
    }

    private SummarizeResponse callSummarizeApi(String text) {
        return webClient.post()
                .uri("/api/summarize")
                .bodyValue(java.util.Map.of("text", text))
                .retrieve()
                .bodyToMono(SummarizeResponse.class)
                .block();
    }

    private String formatSummary(SummarizeResponse res) {
        if (res == null)
            return "요약 생성 실패";

        StringBuilder sb = new StringBuilder();
        sb.append("### 📝 회의 요약\n").append(res.description()).append("\n\n");

        sb.append("#### 📌 핵심 요약\n");
        for (String item : res.core_summary())
            sb.append("- ").append(item).append("\n");
        sb.append("\n");

        sb.append("#### 🏷️ 회의 유형: ").append(res.meeting_type()).append("\n\n");

        sb.append("#### 💬 논의 주제\n");
        for (String item : res.topics())
            sb.append("- ").append(item).append("\n");
        sb.append("\n");

        sb.append("#### ✅ 결정 사항\n");
        for (String item : res.decisions())
            sb.append("- ").append(item).append("\n");
        sb.append("\n");

        sb.append("#### 📅 할 일\n");
        for (String item : res.action_items())
            sb.append("- ").append(item).append("\n");

        return sb.toString();
    }

    private DiarizationResponse callDiarizeAndTranscribe(File audioFile) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new FileSystemResource(audioFile));

        return webClient.post()
                .uri("/api/v1/diarize_and_transcribe")
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(DiarizationResponse.class)
                .block();
    }
}
