# 시스템 아키텍처 및 설계

이 문서는 AI 회의록 프로젝트의 시스템 아키텍처, 데이터 흐름, 그리고 데이터베이스 설계를 설명합니다.

## 1. 시스템 아키텍처 (System Architecture)

이 시스템은 React 프론트엔드, Java Spring Boot 백엔드, Python FastAPI AI 서버, 그리고 MySQL 데이터베이스로 구성됩니다.

```mermaid
graph TD
    subgraph Client ["클라이언트 (사용자 PC)"]
        React[("React 앱 <br/> (MediaRecorder)")]
    end

    subgraph Backend_Layer ["백엔드 서버"]
        Spring[("Java Spring Boot <br/> (WebSocket 서버 / 파일 I/O)")]
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
    Spring -- "WebSocket (실시간 자막)" --> React
    
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
4.  **저장 및 임베딩**: 생성된 세그먼트는 DB에 저장된 후, 비동기 이벤트로 임베딩(벡터화) 처리됩니다.

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
        
        Note over J: Step 2: 세그먼트 생성 (Sliding Window)
        J->>J: 텍스트 버퍼링
        opt 버퍼 가득 참 (20~30초)
            J->>J: 세그먼트 생성 (30% 중첩)
            J->>DB: DB 저장 (Meeting_Segment)
            
            Note over J, P: Step 3: 비동기 임베딩
            J->>P: 임베딩 요청 (비동기 이벤트)
            P->>P: 벡터 생성 (KR-SBERT)
            P-->>DB: DB 저장 (Embeddings)
        end
    end

    Note over U, DB: Step 4: 회의 종료 후 분석
    U->>R: 녹음 종료
    R->>J: 회의 종료 신호
    J->>P: 화자 분리 요청 (전체 오디오)
    P-->>DB: 화자 정보 업데이트 (Meeting_Segments)
    
    Note over U, DB: Step 5: 챗봇 및 보고서 (RAG)
    U->>R: 질문 또는 양식 파일 업로드
    R->>J: 보고서 생성 요청
    J->>P: RAG 검색 & LLM 생성
    P->>DB: 벡터 유사도 검색
    DB-->>P: 관련 세그먼트 반환
    P->>P: 보고서 생성 (qwen3.0)
    P-->>R: 보고서 내용 반환
```

---

## 3. 데이터베이스 설계 (ERD)

```mermaid
erDiagram
    Members {
        Long id PK "기본키"
        String username "사용자명"
        String password "비밀번호"
        String email "이메일"
    }

    Meetings {
        Long id PK "기본키"
        String title "회의 제목"
        DateTime created_at "생성일시"
        Text full_text "전체 내용"
        Enum status "상태 (진행중, 분석중, 완료)"
    }

    Meeting_Segments {
        Long id PK "기본키"
        Long meeting_id FK "회의 ID"
        Integer segment_seq "순서"
        Text chunk_text "세그먼트 내용"
        Integer start_time "시작 시간 (초)"
        String speaker_label "화자 (A, B...)"
        Boolean embedding_status "임베딩 완료 여부"
    }

    Embeddings {
        Long id PK "기본키"
        Long segment_id FK "세그먼트 ID"
        Vector vector_data "768차원 벡터"
    }

    Members ||--o{ Meetings : "소유"
    Meetings ||--|{ Meeting_Segments : "포함"
    Meeting_Segments ||--|| Embeddings : "보유"
```
