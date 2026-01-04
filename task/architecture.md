# 시스템 아키텍처 및 설계

이 문서는 AI 회의록 프로젝트의 시스템 아키텍처, 데이터 흐름, 그리고 데이터베이스 설계를 설명합니다.

> **💡 구현 현황 (2026-01-05)**
> - ✅ 실시간 스트리밍 & STT & 세그먼트 생성
> - ✅ 비동기 임베딩 (MySQL VECTOR 768차원)
> - ✅ RAG 챗봇 (Java 코사인 유사도 + Qwen3-0.6B)
> - ✅ 회의 히스토리 관리 및 전체 검색 (Global Search)
> - ✅ 화자 분리 및 최종 분석 (pyannote + Whisper 정밀 전사)
> - ✅ 파일 업로드 분석 (오디오 업로드 → 화자분리 → 요약 → 챗봇)
> - ✅ 실시간 녹음 수동 제어 (분석/요약/저장 수동 트리거)

## 1. 시스템 아키텍처 (System Architecture)

이 시스템은 React 프론트엔드, Java Spring Boot 백엔드, Python FastAPI AI 서버, 그리고 MySQL 데이터베이스로 구성됩니다.

![시스템 아키텍처 다이어그램](./system_architecture.png)

```mermaid
graph TD
    subgraph Client ["클라이언트 (사용자 PC)"]
        React[("React 앱 <br/> (MediaRecorder)")]
    end

    subgraph Backend_Layer ["백엔드 서버"]
        Spring[("Java Spring Boot <br/> (WebSocket 서버)")]
        FS[("File System <br/> (오디오 파일 저장)")]
    end

    subgraph AI_Layer ["AI 서버 (GPU/CPU)"]
        FastAPI[("Python FastAPI")]
        Whisper[("Whisper STT")]
        Diarization[("Pyannote 화자분리")]
        Embedding[("KR-SBERT 임베딩")]
        LLM[("qwen3.0 0.6b LLM")]
    end

    subgraph Data_Layer ["데이터베이스"]
        MySQL[("MySQL 9.5")]
    end

    %% Connections
    React -- "WebSocket (1초 오디오 청크)" --> Spring
    Spring -- "실시간 자막" --> React
    Spring -- "오디오 파일 저장/로드" --> FS
    React -- "파일 다운로드 요청" --> Spring
    
    Spring -- "HTTP POST (오디오)" --> FastAPI
    FastAPI -- "HTTP 응답 (텍스트)" --> Spring
    
    Spring -- "JDBC/JPA" --> MySQL
    
    FastAPI -- "내부 처리" --> Whisper
    FastAPI -- "내부 처리" --> Diarization
    FastAPI -- "내부 처리" --> Embedding
    FastAPI -- "내부 처리" --> LLM
```

---

## 2. 데이터 흐름 (Data Workflow)

### 실시간 스트리밍 & 처리 루프

1.  **스트리밍**: React가 오디오를 1초 단위로 수집하여 WebSocket으로 전송합니다.
2.  **STT (실시간 변환)**: Spring Boot가 이를 FastAPI(Whisper)로 전달하고, 변환된 텍스트를 받아 React로 반환합니다.
3.  **세그먼트 생성**: 반환된 텍스트는 Java 메모리 버퍼에 쌓이며, 문맥 유지를 위해 **30% 중첩(Overlap)**을 적용하여 세그먼트를 생성합니다.
4.  **저장 및 임베딩**: 생성된 세그먼트는 DB(`segments` 테이블)에 저장된 후, 비동기 이벤트로 임베딩(벡터화) 처리됩니다.

```mermaid
sequenceDiagram
    participant U as 사용자
    participant R as React (프론트엔드)
    participant J as Spring Boot (백엔드)
    participant P as FastAPI (AI 서버)
    participant DB as MySQL

    Note over U, DB: Step 1: 실시간 스트리밍 & STT
    U->>R: 음성 입력
    loop 1초 마다
        R->>J: 오디오 청크 전송 (WebSocket)
        J->>P: STT 변환 요청 (응답 대기)
        P-->>J: 텍스트 반환
        J-->>R: 실시간 자막 전송 (WebSocket)
        R-->>U: 자막 화면 표시
        
        Note over J: Step 2: 실시간 세그먼트 (Realtime)
        J->>J: 텍스트 버퍼링
        opt 세그먼트 생성 트리거 (침묵 또는 문장부호)
            J->>J: 세그먼트 생성 (Sliding Window)
            J->>DB: 저장 (segments)
            
            Note over J, P: Step 3: 실시간 임베딩
            J-->>J: MeetingSegmentSavedEvent 발생
            J->>P: 임베딩 요청 (비동기)
            P->>P: 벡터 생성
            P->>DB: 저장 (embeddings)
        end
    end

    Note over U, DB: Step 4: 회의 종료 및 수동 분석 (Manual Control)
    U->>R: 녹음 종료
    R->>J: WebSocket 종료
    J->>FS: 오디오 파일 저장 완료 & 닫기
    J->>J: 회의 상태 변경 (RECORDED)
    Note over R: 사용자 'AI 요약하기' 또는 '저장하기' 클릭
    R->>J: 분석 요청 (POST /api/meetings/{id}/retry)
    J->>J: 회의 상태 변경 (ANALYZING)
    J->>P: 화자 분리 및 분석 요청
    P-->>FS: 오디오 파일 읽기
    P->>P: 화자 분리 & 세그먼트 재조정
    P->>DB: 저장 (final_segments)
    
    J->>P: 최종 임베딩 요청
    P->>P: 벡터 생성
    P->>DB: 저장 (final_embeddings)
    J->>J: 회의 요약 생성 및 상태 변경 (COMPLETED)

    Note over U, DB: Step 5: RAG 챗봇
    U->>R: 질문
    R->>J: 검색 요청 (Search Request)
    J->>P: 질문 임베딩 요청
    P-->>J: 질문 벡터 반환
    J->>DB: 해당 회의 전체 임베딩 조회
    DB-->>J: 임베딩 목록 반환
    J->>J: Java 코사인 유사도 계산 (상위 5개)
    J->>P: 컨텍스트와 함께 LLM 응답 요청
    P-->>J: 답변 반환
    J-->>R: 챗봇 응답 전송
```

---

## 2.1. 트랜잭션 설계 (Transaction Design)

> **⚠️ 핵심 설계**: 긴 작업(AI 분석)과 DB 트랜잭션을 분리하여 **DB 커넥션 고갈 방지**

### 문제 상황
회의 종료 후 화자 분리 및 요약 생성은 30초~1분 이상 소요됩니다. 이 작업이 하나의 `@Transactional` 블록 안에 있으면:
- DB 커넥션을 장시간 점유 → 커넥션 풀(Pool) 고갈
- 다른 사용자 요청이 대기 → 서비스 멈춤

### 해결: 트랜잭션 쪼개기 (Split Transaction) & 수동 제어

- 실시간 녹음 종료 시에는 `RECORDED` 상태로만 변경하여 커넥션 점유를 방지합니다.
- 사용자가 명시적으로 '요약' 또는 '저장'을 누를 때만 `endMeeting()`이 실행됩니다.
- `MeetingService.endMeeting()` 메서드는 아래와 같이 3단계로 분리되어 긴 작업 중에도 DB 연결을 해제합니다.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    endMeeting(meetingId, audioFile)                  │
│                        (트랜잭션 없음 - @Transactional X)              │
│                                                                      │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │[1] startAnalysis│→│[2] 화자분리   │→│[3] 요약 생성  │→│[4] finish││
│  │ @Transactional │  │   API 호출   │  │   API 호출   │  │ Analysis││
│  │ Status:ANALYZING│  │ (30s~1m)    │  │  (5~10s)     │  │@Transactional│
│  │ (즉시 커밋)   │  │ DB 연결 없음 │  │ DB 연결 없음 │  │Status:COMPLETED│
│  └───────────────┘  └──────────────┘  └──────────────┘  └─────────┘ │
│                                                                      │
│   ⚡ 예외 발생 시 → [5] failAnalysis(@Transactional, FAILED)          │
└─────────────────────────────────────────────────────────────────────┘
```

| 단계 | 메서드 | @Transactional | 설명 |
|------|--------|----------------|------|
| 1 | `startAnalysis()` | ✅ | 상태를 `ANALYZING`으로 변경 후 즉시 커밋 |
| 2 | `callDiarizeAndTranscribe()` | ❌ | Python AI 서버 호출 (30초~1분). DB 연결 없음 |
| 3 | `callSummarizeApi()` | ❌ | 요약 생성 API (5~10초). DB 연결 없음 |
| 4 | `finishAnalysis()` | ✅ | 결과 저장, 상태를 `COMPLETED`로 변경 후 커밋 |
| 5 | `failAnalysis()` | ✅ | 예외 발생 시 상태를 `FAILED`로 변경 후 커밋 |

### 재시도(Retry) 로직

분석이 실패(`FAILED`)된 회의는 `retryAnalysis(meetingId)` 호출로 재시도 가능:

```java
// MeetingController.java
@PostMapping("/{meetingId}/retry")
public ApiResponse<MeetingResponse> retry(@PathVariable Integer meetingId) {
    Meeting result = meetingService.retryAnalysis(meetingId);
    return ApiResponse.ok(MeetingResponse.from(result));
}
```

**API 사용법**: `POST /api/meetings/{id}/retry`

**동작 흐름**:
1. 저장된 오디오 파일 경로 조회 (`uploads/meetings/meeting_{id}.webm`)
2. 파일 존재 확인
3. `endMeeting()` 다시 호출 → 분석 재실행

---

## 3. 데이터베이스 설계 (ERD)

```mermaid
erDiagram
    Members {
        Long member_id PK "기본키"
        String username "사용자명"
        String password "비밀번호"
        String email "이메일"
    }

    Meetings {
        Long meeting_id PK "기본키"
        Long member_id FK "작성자 ID"
        String title "회의 제목"
        DateTime created_at "생성일시"
        Text full_text "전체 내용 (화자분리 결과)"
        Text summary "AI 요약본"
        Enum status "상태 (PROCEEDING, RECORDED, ANALYZING, COMPLETED, FAILED)"
    }

    Realtime_Segments {
        Long segment_id PK "기본키 (테이블명: segments)"
        Long meeting_id FK "회의 ID"
        Integer segment_seq "순서"
        Text chunk_text "세그먼트 내용"
        String speaker_label "화자 라벨"
        Integer start_time "시작 시간 (초)"
        Enum embedding_status "임베딩 상태 (PENDING, SUCCESS, FAILED)"
    }

    Realtime_Embeddings {
        Long embedding_id PK "기본키 (테이블명: embeddings)"
        Long segment_id FK "리얼타임 세그먼트 ID"
        Vector embedding "벡터 (768차원)"
    }

    Final_Segments {
        Long final_segment_id PK "기본키"
        Long meeting_id FK "회의 ID"
        Integer segment_seq "순서"
        Text chunk_text "세그먼트 내용"
        String speaker_label "화자 라벨"
        Integer start_time "시작 시간 (초)"
        Enum embedding_status "임베딩 상태"
    }

    Final_Embeddings {
        Long final_embedding_id PK "기본키"
        Long final_segment_id FK "파이널 세그먼트 ID"
        Vector embedding "벡터 (768차원)"
    }

    Members ||--o{ Meetings : "소유"
    Meetings ||--|{ Realtime_Segments : "실시간 생성"
    Realtime_Segments ||--|| Realtime_Embeddings : "1:1"
    
    Meetings ||--|{ Final_Segments : "분석 후 생성"
    Final_Segments ||--|| Final_Embeddings : "1:1"
```
```
