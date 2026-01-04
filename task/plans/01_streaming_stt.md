# 1단계: 실시간 스트리밍 & STT

## 목표
사용자의 음성을 1초 단위로 백엔드에 스트리밍하고, AI 서버(Whisper)를 통해 실시간 자막(STT)을 프론트엔드에 다시 보냅니다.

## 주요 변경 사항

### 1. 프론트엔드 (React)
- `MediaRecorder`를 사용하여 1초마다 오디오 청크(WebM) 수집
- WebSocket을 통해 바이너리 데이터를 백엔드로 전송
- 서버에서 온 텍스트 응답을 화면에 실시간 노출

### 2. 백엔드 (Java Spring Boot)
- `AudioWebSocketHandler` 구현: 바이너리 오디오 수신 및 AI 서버 연동
- 수신된 오디오 파일 저장 (`/uploads/meetings/`)
- AI 서버의 Whisper 결과를 WebSocket 세션으로 즉시 직렬화하여 전송

### 3. AI 서버 (Python FastAPI)
- `Faster-Whisper` 기반의 고속 STT 엔진 구축
- `/api/v2/whisper` 엔드포인트 제공

## 검증 계획
- 녹음 시작 후 말했을 때, 1~2초 내로 화면에 자막이 나타나는지 확인
- `uploads` 폴더에 오디오 파일이 정상적으로 생성되는지 확인
