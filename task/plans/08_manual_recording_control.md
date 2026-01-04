# Manual Recording Analysis Control Implementation Plan

실시간 회의록 종료 시 자동으로 분석이 시작되는 대신, 사용자가 명시적으로 "AI 요약하기", "저장하기", "지우기"를 선택할 수 있도록 제어 흐름을 변경합니다.

## Proposed Changes

### Backend

#### [MODIFY] [MeetingStatus.java](file:///c:/dev/AI/AI-5-mini-project/backend/src/main/java/com/minipr/backend/meeting/entity/MeetingStatus.java)
- 새 상태 추가: `RECORDED` (녹음은 완료되었으나 분석 전인 상태)

#### [MODIFY] [AudioWebSocketHandler.java](file:///c:/dev/AI/AI-5-mini-project/backend/src/main/java/com/minipr/backend/websocket/AudioWebSocketHandler.java)
- `afterConnectionClosed`에서 자동 분석(`meetingService.endMeeting`) 호출 제거.
- 대신 미팅 상태를 `RECORDED`로 업데이트하는 로직 추가 (필요시 `MeetingService`에 메서드 추가).

#### [MODIFY] [ChatService.java](file:///c:/dev/AI/AI-5-mini-project/backend/src/main/java/com/minipr/backend/service/ChatService.java)
- `RECORDED` 상태일 때도 `PROCEEDING`과 동일하게 실시간 임베딩 테이블(`embeddings`)을 검색하도록 수정.

#### [MODIFY] [MeetingService.java](file:///c:/dev/AI/AI-5-mini-project/backend/src/main/java/com/minipr/backend/meeting/service/MeetingService.java)
- `endMeeting` 호출 시 (`retry` API 등을 통해) 상태가 `RECORDED` -> `ANALYZING` -> `COMPLETED`로 자연스럽게 흐르도록 유지.
- `updateStatus`를 외부에서 호출할 수 있는 편의 메서드 확인 또는 추가.

---

### Frontend

#### [MODIFY] [LiveSttPage.tsx](file:///c:/dev/AI/AI-5-mini-project/frontend/src/liveStt/LiveSttPage.tsx)
- **상태 추가**: `isRecordingFinished` (녹음이 종료되었으나 아직 분석/저장 전인 상태)
- **UI 변경**:
  - 녹음 중에는 현재처럼 '정지' 버튼만 표시.
  - 녹음 정지 후 `isRecordingFinished`가 `true`일 때만 "AI 요약하기", "저장하기", "지우기" 버튼 노출.
- **기능 구현**:
  - **AI 요약하기 (`handleSummarize`)**:
    1. `POST /api/meetings/{id}/retry`를 호출하여 분석 시작.
    2. 분석 완료 후 `MeetingResultDisplay`를 하단에 즉시 렌더링하여 내용을 확인하게 함.
  - **저장하기 (`handleSave`)**:
    1. 내부적으로 분석이 안 되어 있다면 분석 요청 (Background).
    2. 현재 상태(트랜스크립트 등)를 비우고 히스토리 목록으로 이동/업데이트 유도.
  - **지우기 (`handleClear`)**:
    1. `DELETE /api/meetings/{id}` API 호출 (DB 데이터 영구 삭제).
    2. 모든 상태 초기화 및 초기 화면으로 복구.

## Verification Plan

### Automated Tests
- 녹음 종료 후 `meeting` 테이블의 `status`가 여전히 `IN_PROGRESS` 혹은 분석 전 상태인지 확인.
- "AI 요약하기" 클릭 후 API 호출 및 상태가 `COMPLETED`로 변경되는지 확인.

### Manual Verification
1. 실시간 회의록 시작 및 정지.
2. 정지 직후 자동으로 요약이 뜨지 않는지 확인.
3. "AI 요약하기" 버튼 클릭 시 분석 로딩 후 결과가 화면에 나타나는지 확인.
4. 다른 회의에서 "지우기" 클릭 시 DB에서 해당 회의가 사라지는지 확인.
