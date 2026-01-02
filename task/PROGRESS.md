# 🚀 AI 회의록 프로젝트 - 개발 진행 현황

## 최종 업데이트: 2026-01-02

---

## ✅ 완료된 작업

### 1. 실시간 음성 스트리밍 (WebSocket)
- [x] Java Backend: WebSocket 의존성 추가 (`spring-boot-starter-websocket`, `spring-webflux`)
- [x] Java Backend: `WebSocketConfig.java` - WebSocket 설정 (버퍼 512KB)
- [x] Java Backend: `AudioWebSocketHandler.java` - Sliding Window 버퍼링 구현
- [x] Java Backend: `WhisperApiClient.java` - Python AI 서버 호출
- [x] Frontend: WebSocket 연결 및 1초 청크 전송 (`LiveSttPage.tsx`)
- [x] **통합 테스트 완료** - 5초마다 Whisper 호출 성공

### 2. STT 및 텍스트화
- [x] Python AI: Whisper API 구현 (`/api/transcribe`)
- [x] Frontend: Web Speech API 실시간 자막

---

## 🔧 핵심 구현 내용

### Sliding Window 버퍼링 (AudioWebSocketHandler.java)
```
Frontend (1초 청크) → Backend (5개 청크 누적) → Whisper API
                              ↓
                    [헤더 + 버퍼 청크] = 완전한 WebM
```

- 첫 청크: WebM 헤더로 저장
- 이후 청크: 버퍼에 누적 (5개마다 Whisper 호출)
- 연결 종료 시: 남은 청크 처리

### 포트 설정
| 서비스 | 포트 |
|--------|------|
| Frontend | 3000 |
| Backend | 8080 |
| AI Server | 8001 |

### 설정 파일 (로컬용, Git 제외)
- `backend/src/main/resources/application-local.properties`
  - `python.ai.url=http://localhost:8001`

---

## ⏳ 다음 작업 (TODO)

### 3. 세그먼트 생성 (Sliding Window)
- [ ] Java Backend: 메모리 버퍼 클래스 구현
- [ ] Java Backend: 30% Overlap 세그먼트 생성 로직
- [ ] Java Backend: DB 저장 로직

### 4. 비동기 임베딩
- [ ] Java Backend: 이벤트 발행 로직
- [ ] Python AI: 임베딩 API 구현
- [ ] Java Backend: 벡터 저장 로직

### 5. 화자 분리 (Diarization)
- [ ] Python AI: 화자 분리 API 구현
- [ ] Java Backend: 회의 종료 시 트리거

### 6. RAG 챗봇 & 보고서
- [ ] Python AI: RAG 검색 API 구현
- [ ] Python AI: LLM 보고서 생성 API 구현

---

## 💡 참고 사항

### GPU 설정 (현재 CPU 모드)
- 현재: `device="cpu", compute_type="int8"`
- GPU 사용하려면: CUDA PyTorch 설치 필요 (디스크 공간 ~3GB 필요)

### 실행 방법
```bash
# 1. AI 서버 (포트 8001)
cd ai
conda activate ai-project
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# 2. Backend (포트 8080)
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'

# 3. Frontend (포트 3000)
cd frontend
npm run dev
```

---

## 📁 관련 파일

### Backend (WebSocket)
- `backend/src/main/java/com/minipr/backend/websocket/AudioWebSocketHandler.java`
- `backend/src/main/java/com/minipr/backend/websocket/WebSocketConfig.java`
- `backend/src/main/java/com/minipr/backend/websocket/WhisperApiClient.java`

### AI Server
- `ai/app/api/whisper_router.py`

### Frontend
- `frontend/src/liveStt/LiveSttPage.tsx`
