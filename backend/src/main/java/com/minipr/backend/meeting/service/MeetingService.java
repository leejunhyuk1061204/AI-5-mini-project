package com.minipr.backend.meeting.service;

import com.minipr.backend.common.NotFoundException;

import com.minipr.backend.meeting.dto.*;
import com.minipr.backend.meeting.entity.Meeting;
import com.minipr.backend.meeting.entity.MeetingStatus;
import com.minipr.backend.meeting.repository.MeetingRepository;
import com.minipr.backend.member.entity.Member;
import com.minipr.backend.member.service.MemberService;
import com.minipr.backend.segment.entity.EmbeddingStatus;
import com.minipr.backend.segment.entity.FinalSegment;
import com.minipr.backend.segment.repository.FinalSegmentRepository;
import com.minipr.backend.embedding.repository.FinalEmbeddingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MemberService memberService;
    private final WebClient webClient;
    private final FinalSegmentRepository finalSegmentRepository;
    private final FinalEmbeddingRepository finalEmbeddingRepository;

    public MeetingService(MeetingRepository meetingRepository,
            MemberService memberService,
            WebClient.Builder webClientBuilder,
            FinalSegmentRepository finalSegmentRepository,
            FinalEmbeddingRepository finalEmbeddingRepository,
            @Value("${python.ai.url:http://localhost:8000}") String pythonAiUrl) {
        this.meetingRepository = meetingRepository;
        this.memberService = memberService;
        this.webClient = webClientBuilder.baseUrl(pythonAiUrl).build();
        this.finalSegmentRepository = finalSegmentRepository;
        this.finalEmbeddingRepository = finalEmbeddingRepository;
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
        public Meeting endMeeting(Integer meetingId, File audioFile) {
        // 1. 상태를 ANALYZING으로 변경 (private 메서드 호출)
        updateStatus(meetingId, MeetingStatus.ANALYZING);

        try {
            // 2. Python AI 서버 호출: 화자 분리 + 전사
            DiarizationResponse aiResponse = callDiarizeAndTranscribe(audioFile);

            // [에러 해결 부분] formatFullText 메서드 대신 여기서 직접 스트림으로 합칩니다.
            String fullText = aiResponse.segments().stream()
                    .map(s -> "[" + s.speaker() + "]: " + s.text())
                    .collect(Collectors.joining("\n"));

            // 3. 요약 API 호출
            SummarizeResponse summaryResponse = callSummarizeApi(fullText);

            // 4. DB 저장 로직 호출 (파라미터 3개 확인)
            return saveAnalysisResult(meetingId, aiResponse, summaryResponse);
            
        } catch (Exception e) {
            // 에러 발생 시 상태를 FAILED로 변경
            updateStatus(meetingId, MeetingStatus.FAILED);
            throw e;
        }
    }
    

    // 상태만 별도로 업데이트하여 DB에 즉시 반영하는 헬퍼 메서드
    private void updateStatus(Integer meetingId, MeetingStatus status) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new NotFoundException("회의를 찾을 수 없습니다. id=" + meetingId));
        meeting.updateStatus(status);
        meetingRepository.save(meeting);
    }


    @Transactional(readOnly = true)
    public List<Meeting> listByMember(Integer memberId) {
        return meetingRepository.findByMember_MemberId(memberId);
    }

    @Transactional
    public Meeting saveAnalysisResult(Integer meetingId, DiarizationResponse aiRes, SummarizeResponse sumRes) {
        Meeting meeting = get(meetingId);
        
        // 1. Full Text 업데이트
        String fullText = aiRes.segments().stream()
                .map(s -> "[" + s.speaker() + "]: " + s.text())
                .collect(Collectors.joining("\n"));
        meeting.updateFullText(fullText);

        // 2. 요약 업데이트 (전달받은 sumRes 사용)
        meeting.updateSummary(formatSummary(sumRes));

        // 3. 최종 저장소 구축
        processFinalStorage(meeting, aiRes.segments());

        meeting.updateStatus(MeetingStatus.COMPLETED);
        return meetingRepository.save(meeting);
    }

    private void processFinalStorage(Meeting meeting, List<DiarizationSegment> segments) {
        int seq = 0;
        List<FinalSegment> finalSegments = new ArrayList<>();
        List<String> textsToEmbed = new ArrayList<>();

        for (DiarizationSegment s : segments) {
            // 한 화자가 너무 길게 말할 경우 문장 단위로 쪼개기 (약 300자)
            List<String> chunks = splitTextByLength(s.text(), 300);

            for (String chunk : chunks) {
                FinalSegment fs = new FinalSegment(
                        meeting,
                        ++seq,
                        chunk,
                        s.speaker(),
                        (int) s.start());
                finalSegments.add(finalSegmentRepository.save(fs));

                // 임베딩 시 화자 정보를 포함하여 저장 (챗봇 검색 품질 향상)
                textsToEmbed.add("[" + s.speaker() + "]: " + chunk);
            }
        }

        // 일괄 임베딩 생성 (SBERT API)
        if (!textsToEmbed.isEmpty()) {
            List<List<Double>> embeddings = callSbertBatchEmbeddings(textsToEmbed);
            for (int i = 0; i < finalSegments.size(); i++) {
                FinalSegment segment = finalSegments.get(i);
                finalEmbeddingRepository.saveEmbedding(segment.getId(), embeddings.get(i).toString());
                
                // 이 부분을 추가하면 나중에 어떤 세그먼트가 임베딩 실패했는지 추적 가능합니다!
                segment.updateEmbeddingStatus(EmbeddingStatus.COMPLETED); 
            }
        }
    }

    private List<String> splitTextByLength(String text, int maxLength) {
        List<String> results = new ArrayList<>();
        if (text == null || text.isEmpty())
            return results;

        // 마침표를 기준으로 1차 분리 시도
        String[] sentences = text.split("(?<=\\.)\\s+");
        StringBuilder currentChunk = new StringBuilder();

        for (String sentence : sentences) {
            if (currentChunk.length() + sentence.length() > maxLength && currentChunk.length() > 0) {
                results.add(currentChunk.toString().trim());
                currentChunk = new StringBuilder();
            }
            currentChunk.append(sentence).append(" ");
        }

        if (currentChunk.length() > 0) {
            results.add(currentChunk.toString().trim());
        }
        return results;
    }

    private List<List<Double>> callSbertBatchEmbeddings(List<String> texts) {
        Map<String, Object> body = Map.of("texts", texts);
        Map<String, Object> response = webClient.post()
                .uri("/api/embeddings")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                })
                .block();

        return (List<List<Double>>) response.get("embeddings");
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
                //Spring -> Python AI 연동
                .uri("/api/v1/diarize_and_transcribe")
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(DiarizationResponse.class)
                .block();
    }
}
