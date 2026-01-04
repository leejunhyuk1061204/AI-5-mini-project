# 4단계: 비동기 임베딩 (Asynchronous Embedding) 구현 계획

## 목표
실시간으로 생성되는 `RealtimeSegment`에 대해 비동기적으로 임베딩(Vector)을 생성하여 `embeddings` 테이블에 저장합니다.
현재 일부 코드가 구현되어 있으나, 이벤트 발행 로직이 누락되어 있고 API 경로가 일치하지 않아 동작하지 않는 상태입니다. 이를 수정하여 기능을 완성합니다.

## 분석 내용 (Current Status Analysis)
1. **AudioWebSocketHandler.java**: 세그먼트 저장(`save`)은 하지만, `MeetingSegmentSavedEvent`를 발행하지 않음 → 리스너가 동작하지 않음.
2. **EmbeddingClient.java**: AI 서버 호출 URL이 `/api/embedding`으로 되어 있음 → AI 서버는 `/api/v2/embedding`을 기대함.
3. **EmbeddingEventListener.java**: 구현되어 있음. `MeetingSegmentSavedEvent`를 수신하여 로직 수행.

## 변경 제안 (Proposed Changes)

### Java Backend

#### [MODIFY] [AudioWebSocketHandler.java](file:///c:/dev/AI/AI-5-mini-project/backend/src/main/java/com/minipr/backend/websocket/AudioWebSocketHandler.java)
- `ApplicationEventPublisher` 의존성 주입 (Lombok `@RequiredArgsConstructor` 이용).
- `saveSegment` 메서드 마지막에 `eventPublisher.publishEvent(new MeetingSegmentSavedEvent(segment))` 호출 추가.

#### [MODIFY] [EmbeddingClient.java](file:///c:/dev/AI/AI-5-mini-project/backend/src/main/java/com/minipr/backend/embedding/client/EmbeddingClient.java)
- API 호출 경로를 `/api/embedding`에서 `/api/v2/embedding`으로 수정.

#### [MODIFY] [EmbeddingEventListener.java](file:///c:/dev/AI/AI-5-mini-project/backend/src/main/java/com/minipr/backend/embedding/listener/EmbeddingEventListener.java)
- `VECTOR_FROM_TEXT`를 MySQL 9.0 표준 함수명인 `STRING_TO_VECTOR`로 수정 (Cause 1 해결).

#### [MODIFY] [EmbeddingEventListenerTest.java](file:///c:/dev/AI/AI-5-mini-project/backend/src/test/java/com/minipr/backend/embedding/EmbeddingEventListenerTest.java)
- [NEW] `src/test/resources/schema-h2.sql` 파일을 생성하여 H2용 `STRING_TO_VECTOR` 별칭(Alias) 등록.
- 테스트 코드 내에서 DB 저장 실패 시 트랜잭션 전파 및 예외 처리 로직 점검.
- Mock 응답의 벡터 차원을 768로 수정하여 프로덕션 스펙과 일치시킴.

### AI Server (가정)
- 현재 `main.py`와 `embedding_router.py`는 이미 `/api/v2` prefix와 라우터 설정을 가지고 있으므로 수정 불필요.

## 검증 계획 (Verification Plan)

### Manual Verification
1. **서버 실행**: Frontend, Backend, AI Server 구동.
2. **기능 테스트**:
   - 웹 브라우저에서 '녹음 시작' 후 멘트 입력.
   - 3초 이상 침묵하여 세그먼트 생성 유도.
3. **데이터 검증**:
   - MySQL 워크벤치 또는 CLI 접속.
   - `SELECT * FROM embeddings;` 쿼리 실행.
   - `segment_id`가 `segments` 테이블의 최신 레코드와 일치하는지 확인.
   - `embedding` 컬럼에 바이너리/벡터 데이터가 들어있는지 확인.
