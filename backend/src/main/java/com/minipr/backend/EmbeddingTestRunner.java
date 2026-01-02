package com.minipr.backend;

import com.minipr.backend.meeting.entity.Meeting;
import com.minipr.backend.meeting.repository.MeetingRepository;
import com.minipr.backend.segment.entity.MeetingSegment;
import com.minipr.backend.segment.service.SegmentService;
import com.minipr.backend.member.entity.Member;
import com.minipr.backend.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 비동기 임베딩 기능을 테스트하기 위한 런너
 * 'test-embedding' 프로파일로 실행 시 작동합니다.
 * 
 * 실행 방법:
 * ./gradlew bootRun --args='--spring.profiles.active=local,test-embedding'
 */
@Component
@Profile("test-embedding")
@RequiredArgsConstructor
public class EmbeddingTestRunner implements CommandLineRunner {

    private final SegmentService segmentService;
    private final MeetingRepository meetingRepository;
    private final MemberRepository memberRepository;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=================================================");
        System.out.println("🚀 비동기 임베딩 테스트를 시작합니다...");

        // 1. 테스트용 Meeting 조회 또는 생성
        Meeting meeting = meetingRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    System.out.println("ℹ️ 기존 회의가 없어 테스트용 데이터를 생성합니다.");
                    Member member = memberRepository.findAll().stream().findFirst()
                            .orElseGet(() -> memberRepository.save(new Member("testuser", "p123", "test@test.com")));
                    return meetingRepository.save(new Meeting(member, "테스트 회의", "내용 없음"));
                });

        // 2. 테스트용 세그먼트 생성 및 저장 (트리거 발생!)
        String testText = "스프링 이벤트 모델과 비동기 어노테이션을 활용한 임베딩 시스템 테스트입니다.";
        MeetingSegment segment = new MeetingSegment(meeting, 999, testText);

        System.out.println("🎤 저장할 텍스트: " + testText);
        segmentService.saveSegment(segment);

        System.out.println("✅ 세그먼트 저장 성공 (ID: " + segment.getSegmentId() + ")");
        System.out.println("⏳ 비동기 처리가 진행 중입니다. Java 로그와 DB를 확인하세요.");
        System.out.println("=================================================");
    }
}
