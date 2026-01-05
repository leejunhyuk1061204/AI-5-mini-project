package com.minipr.backend.meeting.service;

import com.minipr.backend.common.NotFoundException;
import com.minipr.backend.service.FileStorageService; // Added import

import com.minipr.backend.meeting.dto.*;
import com.minipr.backend.meeting.entity.Meeting;
import com.minipr.backend.meeting.entity.MeetingStatus;
import com.minipr.backend.meeting.repository.MeetingRepository;
import com.minipr.backend.member.entity.Member;
import com.minipr.backend.member.service.MemberService;
import com.minipr.backend.segment.entity.FinalSegment;
import com.minipr.backend.segment.repository.FinalSegmentRepository;
import com.minipr.backend.segment.repository.RealtimeSegmentRepository;
import com.minipr.backend.embedding.repository.EmbeddingRepository;
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
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MemberService memberService;
    private final WebClient webClient;
    private final RealtimeSegmentRepository realtimeSegmentRepository;
    private final FinalSegmentRepository finalSegmentRepository;
    private final EmbeddingRepository embeddingRepository;
    private final FinalEmbeddingRepository finalEmbeddingRepository;
    private final FileStorageService fileStorageService;

    public MeetingService(MeetingRepository meetingRepository,
            MemberService memberService,
            WebClient.Builder webClientBuilder,
            RealtimeSegmentRepository realtimeSegmentRepository,
            FinalSegmentRepository finalSegmentRepository,
            EmbeddingRepository embeddingRepository,
            FinalEmbeddingRepository finalEmbeddingRepository,
            FileStorageService fileStorageService,
            @Value("${python.ai.url:http://localhost:8000}") String pythonAiUrl) {
        this.meetingRepository = meetingRepository;
        this.memberService = memberService;
        this.webClient = webClientBuilder
                .baseUrl(pythonAiUrl)
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();
        this.realtimeSegmentRepository = realtimeSegmentRepository;
        this.finalSegmentRepository = finalSegmentRepository;
        this.embeddingRepository = embeddingRepository;
        this.finalEmbeddingRepository = finalEmbeddingRepository;
        this.fileStorageService = fileStorageService;
        // 빈 주입 문제 방지를 위해 생성자 주입은 Lombok @RequiredArgsConstructor 권장하지만, 기존 스타일 유지
        // 그러나 순환 참조(MeetingService <-> FileStorageService) 가능성 주의.
        // FileStorageService가 단순 파일 유틸이면 괜찮음.
        // 여기선 일단 파라미터로 받지 않고, 필드만 추가하면 컴파일 에러 나니 생성자도 수정해야 함.
        // 하지만 FileStorageService를 가져오려면 생성자 파라미터에 추가해야 함.
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

    @Transactional
    public void delete(Integer meetingId) {
        Meeting meeting = get(meetingId);

        // 1. Delete associated embeddings
        embeddingRepository.deleteBySegment_Meeting_MeetingId(meetingId);
        finalEmbeddingRepository.deleteByFinalSegment_Meeting_MeetingId(meetingId);

        // 2. Delete associated segments
        realtimeSegmentRepository.deleteByMeeting_MeetingId(meetingId);
        finalSegmentRepository.deleteByMeeting_MeetingId(meetingId);

        // 3. Delete meeting record
        meetingRepository.delete(meeting);

        // 4. Delete audio file
        fileStorageService.deleteAudio(Long.valueOf(meetingId));
    }

    /**
     * 회의 종료: 화자 분리 및 정밀 전사 수행 후 full_text 업데이트 및 최종 테이블(Final) 구축
     */
    /**
     * 회의 종료 (트랜잭션 분리 적용): 화자 분리 및 정밀 전사 수행 후 full_text 업데이트 및 최종 테이블 구축.
     * 주의: 이 메서드는 긴 시간이 소요되므로 @Transactional을 붙이지 않음.
     */
    public Meeting endMeeting(Integer meetingId, File audioFile) {
        // 1. [Short Tx] 상태 변경 (ANALYZING)
        startAnalysis(meetingId);

        try {
            // 2. [No Tx] Python AI 서버 호출 (화자 분리 + 정밀 전사)
            DiarizationResponse aiResponse = callDiarizeAndTranscribe(audioFile);

            // 3. [No Tx] fullText 생성
            List<String> chunkTexts = aiResponse.segments().stream()
                    .map(s -> cleanTranscription("[" + s.speaker() + "]: " + s.text()))
                    .collect(Collectors.toList());
            String fullText = mergeSegments(chunkTexts);

            String cleanedText = cleanTranscription(fullText);

            // 4. [No Tx] 요약 생성 API 호출 (정밀 분석 결과 기반)
            String summary;
            try {
                log.info("📝 [Analysis] 정밀 요약 생성 중...");
                SummarizeResponse summaryResponse = callSummarizeApi(cleanedText);
                summary = formatSummary(summaryResponse);
            } catch (Exception e) {
                log.error("❌ [Analysis] 요약 생성 실패: {}", e.getMessage());
                summary = "요약 생성에 실패했습니다.";
            }

            // 5. [Short Tx] 결과 저장 및 완료 처리
            return finishAnalysis(meetingId, aiResponse.segments(), fullText, summary);

        } catch (Exception e) {
            // 6. [Short Tx] 실패 상태 업데이트
            failAnalysis(meetingId);
            throw e;
        }
    }

    /**
     * 분석 재시도: FAILED 상태 등의 회의를 다시 분석
     */
    public Meeting retryAnalysis(Integer meetingId) {
        get(meetingId); // Check exists
        // 파일 경로 조회
        java.nio.file.Path path = fileStorageService.getFilePath(Long.valueOf(meetingId));
        File audioFile = path.toFile();

        if (!audioFile.exists()) {
            throw new NotFoundException("오디오 파일을 찾을 수 없습니다: " + path);
        }

        return endMeeting(meetingId, audioFile);
    }

    /**
     * 빠른 요약: 화자 분리 없이 실시간 STT 결과만 취합하여 요약 생성
     */
    @Transactional
    public Meeting summarizeFast(Integer meetingId) {
        Meeting meeting = get(meetingId);

        // 1. 실시간 세그먼트 취합
        List<com.minipr.backend.segment.entity.RealtimeSegment> realtimeSegments = realtimeSegmentRepository
                .findByMeeting_MeetingIdOrderBySegmentSeqAsc(meetingId);

        if (realtimeSegments.isEmpty()) {
            throw new RuntimeException("요약할 회의 내용이 없습니다.");
        }

        List<String> chunkTexts = realtimeSegments.stream()
                .map(s -> s.getChunkText())
                .collect(Collectors.toList());

        String fullText = mergeSegments(chunkTexts);
        String cleanedText = cleanTranscription(fullText);

        log.info("🚀 [AI API] 요약 요청 전송 - 미팅 ID: {}, 텍스트 길이: {}", meetingId, cleanedText.length());
        log.debug("🚀 [AI API] 입력 텍스트: {}", cleanedText);

        // 2. AI 서버 요약 호출
        SummarizeResponse summaryResponse = callSummarizeApi(cleanedText);
        String summary = formatFastSummary(summaryResponse);

        log.info("✅ [AI API] 요약 완료 - 생성된 요약 길이: {}", summary.length());

        // 3. 요약 결과만 업데이트 (상태는 RECORDED 유지)
        meeting.updateSummary(summary);
        meeting.updateFullText(fullText); // 가독성을 위해 일단 합쳐진 텍스트 저장

        return meetingRepository.save(meeting);
    }

    @Transactional
    public void startAnalysis(Integer meetingId) {
        Meeting meeting = get(meetingId);
        meeting.updateStatus(MeetingStatus.ANALYZING);
        meetingRepository.save(meeting);
    }

    @Transactional
    public void updateStatus(Integer meetingId, MeetingStatus status) {
        Meeting meeting = get(meetingId);
        meeting.updateStatus(status);
        meetingRepository.save(meeting);
    }

    @Transactional
    public Meeting finishAnalysis(Integer meetingId, List<DiarizationSegment> segments, String fullText,
            String summary) {
        Meeting meeting = get(meetingId);

        // 1. 분석 결과 저장
        meeting.updateFullText(fullText);
        meeting.updateSummary(summary);

        // 2. Final 테이블 구축 (화자별 세그먼트 분리 및 임베딩)
        processFinalStorage(meeting, segments);

        // 3. 상태 완료
        meeting.updateStatus(MeetingStatus.COMPLETED);
        return meetingRepository.save(meeting);
    }

    @Transactional
    public void failAnalysis(Integer meetingId) {
        try {
            Meeting meeting = get(meetingId);
            meeting.updateStatus(MeetingStatus.FAILED);
            meetingRepository.save(meeting);
        } catch (Exception e) {
            System.err.println("상태 업데이트 실패: " + e.getMessage());
        }
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
                finalEmbeddingRepository.saveEmbedding(
                        finalSegments.get(i).getId(),
                        embeddings.get(i).toString());
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

    private static final Map<String, String> TECH_TERM_MAP = Map.ofEntries(
            Map.entry("박백업", "백엔드"),
            Map.entry("백앤들", "백엔드"),
            Map.entry("백앤드는", "백엔드"),
            Map.entry("백행되는", "백엔드는"),
            Map.entry("스탱", "스택"),
            Map.entry("스탭", "스택"),
            Map.entry("스택을 준비합니다", "스택을 정리합니다"),
            Map.entry("기술 스테이크", "기술 스택"),
            Map.entry("기술 스탭", "기술 스택"),
            Map.entry("기술 스텝", "기술 스택"),
            Map.entry("파인썸", "FastAPI"),
            Map.entry("퓨스트", "FastAPI"),
            Map.entry("페스트", "FastAPI"),
            Map.entry("패스탱", "FastAPI"),
            Map.entry("파이스와", "Python"),
            Map.entry("파이스", "Python"),
            Map.entry("베스트 API", "FastAPI"),
            Map.entry("패스트 AP", "FastAPI"),
            Map.entry("ABI", "API"),
            Map.entry("인비딩", "임베딩"),
            Map.entry("임패딩", "임베딩"),
            Map.entry("인베리인", "임베딩"),
            Map.entry("인베딩", "임베딩"),
            Map.entry("부추겠습니다", "구축하겠습니다"),
            Map.entry("붙이겠습니다", "구축하겠습니다"),
            Map.entry("버튼을 사용하고", "부트를 사용하고"),
            Map.entry("부터를 사용하고", "부트를 사용하고"),
            Map.entry("마이에스큐에", "MySQL"),
            Map.entry("ISQL", "MySQL"),
            Map.entry("isql", "MySQL"),
            Map.entry("mi-sql", "MySQL"),
            Map.entry("mi sql", "MySQL"),
            Map.entry("마이 SQR", "MySQL"),
            Map.entry("잡아 스프링", "Java Spring"),
            Map.entry("자버 스프링", "Java Spring"),
            Map.entry("자바스프링", "Java Spring"),
            Map.entry("AAH", "AI 엔진"),
            Map.entry("AANG", "AI 엔진"),
            Map.entry("AA-NG", "AI 엔진"),
            Map.entry("KER 다시", "Ko-sbert"),
            Map.entry("kr 다시", "Ko-sbert"),
            Map.entry("768차고", "768차원"));

    private String cleanTranscription(String text) {
        if (text == null || text.isEmpty())
            return "";

        // 1. 기술 용어 교정
        String cleaned = text;
        for (Map.Entry<String, String> entry : TECH_TERM_MAP.entrySet()) {
            cleaned = cleaned.replace(entry.getKey(), entry.getValue());
        }

        // 2. 반복 문장/구 제거 (단순 인접 중복 제거)
        String[] sentences = cleaned.split("(?<=\\.)\\s+");
        StringBuilder sb = new StringBuilder();
        String lastSentence = "";
        for (String s : sentences) {
            String trimmed = s.trim();
            if (!trimmed.equals(lastSentence)) {
                sb.append(trimmed).append(" ");
                lastSentence = trimmed;
            }
        }
        return sb.toString().trim();
    }

    private String mergeSegments(List<String> segments) {
        if (segments == null || segments.isEmpty())
            return "";
        if (segments.size() == 1)
            return segments.get(0).trim();

        StringBuilder sb = new StringBuilder(segments.get(0).trim());
        for (int i = 1; i < segments.size(); i++) {
            String next = segments.get(i).trim();
            String current = sb.toString();

            // 겹치는 부분 찾기 (최대 100자 정도 확인)
            int matchLen = 0;
            int maxOverlap = Math.min(Math.min(current.length(), next.length()), 150);

            for (int len = maxOverlap; len >= 1; len--) {
                String tail = current.substring(current.length() - len);
                if (next.startsWith(tail)) {
                    matchLen = len;
                    break;
                }
            }

            if (matchLen > 0) {
                sb.append(next.substring(matchLen));
            } else {
                sb.append(" ").append(next);
            }
        }
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
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

    private String formatFastSummary(SummarizeResponse res) {
        if (res == null)
            return "요약 생성 실패";

        StringBuilder sb = new StringBuilder();
        sb.append(res.description()).append("\n\n");

        if (res.core_summary() != null && !res.core_summary().isEmpty()) {
            for (int i = 0; i < Math.min(res.core_summary().size(), 2); i++) {
                sb.append("• ").append(res.core_summary().get(i)).append("\n");
            }
        }

        return sb.toString().trim();
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

        sb.append("#### 🚀 조치 필요 사항\n");
        for (String item : res.action_items())
            sb.append("- ").append(item).append("\n");
        sb.append("\n");

        sb.append("#### ⏳ 보류 및 논의 필요\n");
        for (String item : res.pending_items())
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
