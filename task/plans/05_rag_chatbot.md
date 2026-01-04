# RAG 기반 AI 챗봇 구현 계획서

> ✅ **구현 상태: 완료** (2026-01-04)

이 문서는 회의록 내용을 바탕으로 답변하는 **RAG(Retrieval-Augmented Generation)** 기능이 포함된 AI 챗봇 구현 계획을 설명합니다.

---

## 🏗️ 시스템 아키텍처 (RAG Flow)

1.  **질문 수신**: 프론트엔드에서 사용자의 질문을 백엔드로 전송.
2.  **질문 벡터화**: 백엔드에서 AI 서버의 임베딩 API를 호출하여 질문을 벡터(768차원)로 변환.
3.  **유사도 검색**: 백엔드(Java)에서 해당 회의의 전체 임베딩을 조회한 후, **코사인 유사도 계산**으로 관련성 높은 세그먼트 추출.
4.  **컨텍스트 구성**: 검색된 회의 내용과 이전 대화 이력을 합쳐서 LLM용 프롬프트 생성.
5.  **응답 생성**: AI 서버(Qwen3-0.6B)가 최종 답변을 생성하여 반환.

---

## 🛠️ 컴포넌트별 상세 계획

### 1. AI 서버 (Python FastAPI)
- **[Existing]** [chat_router.py](file:///c:/dev/AI/AI-5-mini-project/ai/app/api/chat_router.py): Qwen3-0.6B 모델을 통한 기본 채팅 기능 제공.
- **[NEW]** `/api/v2/embedding` (질문 벡터화): 사용자의 질문을 벡터로 변환하는 엔드포인트 활용.
- **[Enhancement]** [chat_router.py](file:///c:/dev/AI/AI-5-mini-project/ai/app/api/chat_router.py) 시스템 프롬프트 고도화: 참조된 컨텍스트를 바탕으로 답변하도록 수정.

### 2. 백엔드 (Java Spring Boot)
- **Vector Search (Java 기반)**: 
  - MySQL 9.5 CE는 `DISTANCE` 함수를 지원하지 않으므로, **Java에서 코사인 유사도 계산**.
  - `EmbeddingRepository.findAllBySegmentMeetingId()`로 해당 회의 임베딩 조회.
  - `ChatService.cosineSimilarity()`로 유사도 계산 후 상위 5개 선택.
- **ChatService**: 
  - 검색된 컨텍스트를 조합하여 AI 서버에 최종 요청.
  - 간단한 세션 기반 대화 이력 관리.
- **API Endpoint**: `POST /api/chat` 구현 완료.

### 3. 프론트엔드 (React)
- **Chatbot UI**: 
  - 회의 화면 우측 또는 하단에 플로팅/사이드바 형태의 채팅창 구현.
- **State Management**: 
  - `meetingId`와 연동하여 해당 회의 내용 내에서만 검색이 가능하도록 설정.

---

## 📅 구현 단계

| 단계 | 작업 내용 | 상태 | 비고 |
| :--- | :--- | :---: | :--- |
| **1단계** | 질문 임베딩 및 벡터 검색 쿼리 검증 | ✅ | Java 코사인 유사도로 구현 |
| **2단계** | 백엔드 Chat API 및 AI 서버 연동 | ✅ | RAG 기본 흐름 완성 |
| **3단계** | 프론트엔드 채팅 UI 구현 | 🔲 | 사용자 인터페이스 미완성 |
| **4단계** | 최종 튜닝 및 예외 처리 | 🔲 | 답변 품질 및 속도 최적화 예정 |

---

## ✅ 검증 계획

- **기능 검증**: "이번 프로젝트의 마감 기한이 언제야?"와 같은 구체적인 질문에 회의 데이터 내용을 바탕으로 정확히 답변하는지 확인.
- **성능 검증**: 벡터 검색부터 AI 답변 생성까지의 전체 소요 시간(Latency) 측정 및 최적화.
- **UI/UX**: 대화 이력이 자연스럽게 표시되고, 로딩 중 표시(Spinner)가 적절히 작동하는지 확인.
