# 구현 계획서: 회의록 히스토리 페이지

## 목표
사용자가 자신의 과거 회의록 목록을 조회하고, 클릭 시 상세 내용을 확인하며, 필요 시 삭제할 수 있는 페이지를 구현합니다.
또한, **과거 회의 내용에 대해 AI 챗봇과 대화**할 수 있는 기능을 포함합니다.

## 변경 제안

### 1. 백엔드 (Backend)
회의록 삭제 기능이 누락되어 있어 이를 추가합니다.

#### [MODIFY] `backend/src/main/java/com/minipr/backend/meeting/controller/MeetingController.java`
- **[NEW] DELETE Endpoint**: `DELETE /api/meetings/{meetingId}`
  - `MeetingService.delete(meetingId)` 호출

#### [MODIFY] `backend/src/main/java/com/minipr/backend/meeting/service/MeetingService.java`
- **[NEW] Method**: `void delete(Integer meetingId)`
  - DB에서 해당 회의(Meeting) 및 연관된 세그먼트, 임베딩 데이터를 삭제합니다. (Cascade 설정 확인 필요)
  - 파일 시스템에 저장된 오디오 파일도 함께 삭제합니다.

### 2. 프론트엔드 (Frontend)

#### [NEW] `frontend/src/historyPage/HistoryPage.tsx`
- **Route**: `/history` (App.tsx에 라우트 추가)
- **Layout**: 사이드바 포함 (`Sidebar` 컴포넌트 재사용)
- **List View**:
  - `GET /api/meetings?memberId={currentMemberId}` 호출하여 목록 조회
  - 각 항목에 날짜, 제목, 요약(일부분), 태그 표시
  - 삭제 버튼 포함 (클릭 시 확인 후 API 호출)
- **Detail View (Modal or Page)**:
  - 목록 클릭 시 상세 내용 표시
  - 앞서 계획된 `<MeetingResultDisplay />` 컴포넌트 재사용하여 일관된 디자인 제공
- **Chatbot Integration**:
  - 상세 조회 시 우측 하단에 `<Chatbot />` 컴포넌트 배치
  - 선택된 `meetingId`를 전달하여 해당 회의에 대한 RAG 검색 및 질의응답 지원

#### [MODIFY] `frontend/src/sidebar/Sidebar.tsx`
- 사이드바 메뉴에 '히스토리' 또는 '지난 회의록' 링크 추가

## 검증 계획
1. **목록 조회**: 로그인한 사용자의 회의록만 정확히 조회되는지 확인.
2. **삭제 기능**: 삭제 후 목록에서 사라지는지, 그리고 실제 DB와 파일 시스템에서도 정리되는지 확인.
3. **상세 조회 및 챗봇**:
   - 목록 클릭 시 회의록 UI가 정상 렌더링되는지 확인.
   - 챗봇을 열어 "이 회의에서 김철수가 무슨 말을 했어?" 등의 질문 시 정상 답변하는지 확인.
