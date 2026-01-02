# 회의록 시스템 구현 체크리스트

## 1. 실시간 스트리밍 (WebSocket)
- [x] Java Backend: WebSocket 의존성 추가
- [x] Java Backend: WebSocket 설정 클래스 생성
- [x] Java Backend: AudioWebSocketHandler 구현
- [x] Java Backend: WhisperApiClient 구현 (Python AI 호출)
- [x] Java Backend: FileStorageService 구현 (오디오 파일 저장)
- [x] Java Backend: FileController 구현 (오디오 다운로드 API)
- [x] Frontend: WebSocket 연결 로직 추가
- [x] Frontend: 1초마다 오디오 청크 전송 로직 구현
- [x] Frontend: 녹음 종료 시 오디오 다운로드 기능
- [ ] 통합 테스트

## 2. STT 및 텍스트화
- [x] Python AI: Whisper API 구현 (`/api/transcribe`)
- [x] Python AI: VAD(음성 활동 감지) 기능 추가
- [x] Frontend: Web Speech API 실시간 자막 (기존)

## 3. 세그먼트 생성 (Sliding Window)
- [ ] Java Backend: 메모리 버퍼 클래스 구현
- [ ] Java Backend: 30% Overlap 세그먼트 생성 로직
- [ ] Java Backend: DB 저장 로직

## 4. 비동기 임베딩
- [ ] Java Backend: 이벤트 발행 로직
- [ ] Python AI: 임베딩 API 구현
- [ ] Java Backend: 벡터 저장 로직

## 5. 화자 분리 및 최종 분석 (Diarization)
- [x] Java Backend: FinalSegment 엔티티 생성
- [x] Java Backend: FinalEmbedding 엔티티 생성
- [ ] Python AI: 화자 분리 API 구현 (pyannote 필요)
- [ ] Java Backend: 회의 종료 시 분석 트리거
- [ ] Java Backend: Meeting.status 업데이트 로직

## 6. RAG 챗봇 & 보고서
- [ ] Python AI: RAG 검색 API 구현
- [ ] Python AI: LLM 보고서 생성 API 구현
- [ ] Java Backend: 파일 업로드 처리
- [ ] Frontend: 챗봇 UI 구현
