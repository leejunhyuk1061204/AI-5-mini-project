# 🚀 AI 회의록 프로젝트 - 통합 개발 진행 현황

## 최종 업데이트: 2026-01-06 (회의 히스토리 구현 및 AI 콜드스타트 개선 완료)

이 문서는 프로젝트의 진행 상황, 상세 기술 설정, 그리고 향후 계획을 관리하는 통합 문서입니다.

---

## 📊 시스템 현황 개요
- [x] **실시간 음성 스트리밍 (WebSocket)**: 구현 완료
- [x] **STT (Whisper API)**: 구현 완료
- [x] **비동기 임베딩 (MySQL VECTOR)**: 구현 완료
- [x] **화자 분리 및 최종 분석**: 구현 및 활성화 완료 (Python pyannote + Whisper 정밀 분석)
- [x] **RAG 기반 AI 챗봇**: 구현 완료 (Java 코사인 유사도 + Qwen3-1.7B LLM)
- [x] **회의 히스토리 및 전체 검색**: 구현 완료 (전역 검색 토글 지원)
- [x] **실시간 녹음 수동 제어**: 구현 완료 (`RECORDED` 상태 및 수동 분석 트리거)
- [x] **파일 업로드 분석**: 구현 완료 (오디오 파일 업로드 → 화자분리 → 요약 → 챗봇)
- [x] **AI 서비스 개선**: 요약 모델 Cold Start 문제 해결 (Startup 프리로드 도입)

---

## ✅ 구현 체크리스트

### 0. 프로젝트 환경 정리
- [x] 불필요한 테스트용 샘플 삭제
- [x] 자동 생성된 빌드 아티팩트 정리
- [x] 개발 잔재 코드 정리 (EmbeddingTestRunner 등 제거)

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
- [x] Python AI: 화자 분리 API 구현 (`pyannote/speaker-diarization-3.1`)
- [x] 회의 종료 시 상태 변경 (`RECORDED`) 및 수동 분석 대기
- [x] 화자별 분리 결과 저장 및 전체 대화록(`full_text`) 생성

### 5. RAG 챗봇 & 회의 요약
- [x] Java 코사인 유사도 기반 동적 벡터 검색 구현 (Status에 따라 테이블 전환)
- [x] 전역 검색(Global Search) 구현 (모든 회의 대상 검색 지원)
- [x] Chat API 구현 (`POST /api/chat`)
- [x] Qwen3-0.6B LLM 연동 및 컨텍스트 기반 답변 생성
- [x] 사이드 패널 형태의 전역 챗봇 UI 통합

### 6. 회의 히스토리 페이지 (History) [NEW]
- [x] 회의 목록 조회 API 구현
- [x] 회의 삭제 API 및 연쇄 삭제 로직 구현
- [x] 히스토리 페이지 UI 구현 (`HistoryPage.tsx`)
- [x] 공통 회의록 결과 컴포넌트 (`MeetingResultDisplay`) 적용

### 7. 파일 업로드 및 UI 통합
- [x] 프론트엔드 파일 업로드 UI 리팩토링
- [x] 백엔드 업로드 API (`POST /api/meetings/upload`)
- [x] 공통 마크다운 파싱 유틸리티 (`meetingUtils.ts`) 연동
- [x] PDF 내보내기 기능 통합

---

## 🛠️ 기술 명세 및 설정

### 포트 설정
| 서비스 | 포트 | 비고 |
|--------|------|------|
| Frontend | 3000 | React (Vite) |
| Backend | 8080 | Java Spring Boot |
| AI Server | 8001 | Python FastAPI |

### 핵심 설정 파일
- `backend/src/main/resources/application-local.properties` : 로컬 개발용 DB/AI 서버 설정
- `backend/src/main/java/com/minipr/backend/websocket/WebSocketConfig.java` : WebSocket 핸들러 및 버퍼 설정

---

## 📁 관련 주요 파일
- **백엔드**: `AudioWebSocketHandler.java`, `ChatService.java`, `MeetingService.java`, `MeetingController.java`, `MeetingStatus.java`
- **AI**: `whisper_router.py`, `embedding_router.py`, `chat_router.py`, `diarization_router.py`, `summarize.py`
- **프론트엔드**: `LiveSttPage.tsx`, `HistoryPage.tsx`, `UploadPage.tsx`, `MeetingResultDisplay.tsx`, `Chatbot.tsx`, `meetingUtils.ts`

---

## ⏳ 향후 고도화 계획
- [ ] 회의 키워드 자동 추출 및 태그 기반 필터링
- [ ] 화자별 발언 비중 시각화 차트 추가
- [ ] 다국어 번역 지원 (STT 이후 번역 레이어 추가)
