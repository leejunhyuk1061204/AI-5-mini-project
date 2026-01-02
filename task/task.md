# 회의록 시스템 구현 체크리스트

## 1. 실시간 스트리밍 (WebSocket)
- [x] Java Backend: WebSocket 의존성 추가
- [x] Java Backend: WebSocket 설정 클래스 생성
- [x] Java Backend: AudioWebSocketHandler 구현
- [x] Java Backend: WhisperApiClient 구현 (Python AI 호출)
- [x] Frontend: WebSocket 연결 로직 추가
- [x] Frontend: 1초마다 오디오 청크 전송 로직 구현
- [ ] 통합 테스트

## 2. STT 및 텍스트화
- [x] Python AI: Whisper API 구현 (`/api/transcribe`)
- [x] Frontend: Web Speech API 실시간 자막 (기존)

## 3. 세그먼트 생성 (Sliding Window)
- [ ] Java Backend: 메모리 버퍼 클래스 구현
- [ ] Java Backend: 30% Overlap 세그먼트 생성 로직
- [ ] Java Backend: DB 저장 로직

## 4. 비동기 임베딩
- [ ] Java Backend: 이벤트 발행 로직
- [ ] Python AI: 임베딩 API 구현
- [ ] Java Backend: 벡터 저장 로직

## 5. 화자 분리 (Diarization)
- [ ] Python AI: 화자 분리 API 구현
- [ ] Java Backend: 회의 종료 시 트리거
- [ ] Java Backend: 세그먼트별 화자 정보 업데이트

## 6. RAG 챗봇 & 보고서
- [ ] Python AI: RAG 검색 API 구현
- [ ] Python AI: LLM 보고서 생성 API 구현
- [ ] Java Backend: 파일 업로드 처리
- [ ] Frontend: 챗봇 UI 구현
