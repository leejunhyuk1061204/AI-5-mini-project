# 🚀 AI 회의록 프로젝트 - 통합 개발 진행 현황

## 최종 업데이트: 2026-01-04 (챗봇 구현/테스트 완료)

이 문서는 프로젝트의 진행 상황, 상세 기술 설정, 그리고 향후 계획을 관리하는 통합 문서입니다.

---

## 📊 시스템 현황 개요
- [x] **실시간 음성 스트리밍 (WebSocket)**: 구현 완료
- [x] **STT (Whisper API)**: 구현 완료
- [x] **비동기 임베딩 (MySQL VECTOR)**: 구현 완료
- [ ] **화자 분리 및 최종 분석**: 진행 예정
- [x] **RAG 기반 AI 챗봇**: 구현 및 테스트 완료 (Java 코사인 유사도 + Qwen3-0.6B LLM)

---

## ✅ 구현 체크리스트

### 0. 프로젝트 환경 정리
- [x] 불필요한 테스트용 샘플 삭제
- [x] 자동 생성된 빌드 아티팩트 정리
- [ ] 개발 잔재 코드 정리 (EmbeddingTestRunner 등)

### 1. 실시간 스트리밍 & STT
- [x] WebSocket 아키텍처 구축 (512KB 버퍼)
- [x] 1초 오디오 청크 스트리밍 및 WebM 바이너리 구성
- [x] Whisper API 연동 및 실시간 자막 반환
- [x] 오디오 파일 저장 및 다운로드 기능

### 2. 세그먼트 생성 (Sliding Window)
- [x] 30% 중첩(Overlap) 적용 세그먼트 생성 로직
- [x] 침묵(3초) 및 문장부호 트리거 기반 분리
- [x] `segments` 테이블 저장 로직 완성

### 3. 비동기 임베딩 (Real-time)
- [x] `MeetingSegmentSavedEvent` 이벤트 발행 및 리스너 구현
- [x] Python AI 서버 임베딩 API 연동 (`/api/v2/embedding`)
- [x] MySQL 9.5 `VECTOR(768)` 타입 저장 및 `STRING_TO_VECTOR` 활용

### 4. 화자 분리 및 최종 분석 (Diarization)
- [x] `FinalSegment`, `FinalEmbedding` 엔티티 생성
- [ ] Python AI: 화자 분리 API 구현 (`pyannote`)
- [ ] 회의 종료 시 분석 프로세스 트리거 (상태: `ANALYZING`)
- [ ] 화자별 분리 결과 저장 및 전체 대화록(`full_text`) 생성

### 5. RAG 챗봇 & 회의 요약
- [x] Java 코사인 유사도 기반 벡터 검색 구현 (MySQL CE 호환)
- [x] Chat API 구현 (`POST /api/chat`)
- [x] Qwen3-0.6B LLM 연동 및 컨텍스트 기반 답변 생성
- [x] 챗봇 API 테스트 완료 (임베딩 조회 → 유사도 검색 → LLM 응답)
- [ ] LLM 기반 회의 요약 생성 (`Meeting.summary`)
- [ ] Context-aware 대화형 챗봇 UI 완성

---

## � 기술 명세 및 설정

### 포트 설정
| 서비스 | 포트 | 비고 |
|--------|------|------|
| Frontend | 3000 | React (Vite) |
| Backend | 8080 | Java Spring Boot |
| AI Server | 8001 | Python FastAPI |

### 핵심 설정 파일
- `backend/src/main/resources/application-local.properties` : 로컬 개발용 DB/AI 서버 설정
- `backend/src/main/java/com/minipr/backend/websocket/WebSocketConfig.java` : WebSocket 핸들러 및 버퍼 설정

### Sliding Window 로직
- Frontend (1초 청크) → Backend (5개 청크 누적) → Whisper API 호출
- 결과 텍스트를 메모리 버퍼(`MeetingSession`)에 저장 후 특정 조건에서 세그먼트화.

---

## 💡 실행 방법

### 1. AI 서버 (Python)
```bash
cd ai
conda activate ai-project
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 2. 백엔드 (Java)
```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

### 3. 프론트엔드 (React)
```bash
cd frontend
npm run dev
```

---

## 📁 관련 주요 파일
- **백엔드**: `AudioWebSocketHandler.java`, `MeetingSession.java`, `EmbeddingEventListener.java`, `ChatController.java`, `ChatService.java`
- **AI**: `whisper_router.py`, `embedding_router.py`, `chat_router.py`
- **프론트엔드**: `LiveSttPage.tsx`

---

## ⏳ 보류 중인 개선 제안
- [ ] 회의 키워드 자동 추출 (태그화)
- [ ] PDF/Markdown 리포트 다운로드 기능
- [ ] 화자별 발언 비중 및 통계 시각화 대시보드
