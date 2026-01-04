# 구현 계획서: 회의록 결과 UI 통합

## 목표
업로드 페이지('파일 업로드 후 회의록 생성')와 실시간 녹음 페이지('녹음 및 분석 완료')에서 **동일한 회의록 결과 UI**를 제공하여 사용자 경험의 일관성을 확보합니다.

## 변경 제안

### 1. 공통 컴포넌트 추출 (Result UI Extraction)
현재 `uploadPage/components/SttConversion.tsx`에 구현된 결과 표시 UI를 별도의 재사용 가능한 컴포넌트로 분리합니다.

#### [NEW] `frontend/src/components/MeetingResultDisplay.tsx`
- **역할**: `SttResultData` 포맷의 데이터를 받아 회의록 결과를 렌더링합니다.
- **포함 기능**:
  - 회의 요약 (개요, 핵심 요약)
  - 결정 사항 및 조치 필요 사항 그리드 레이아웃
  - 보류 및 논의 필요 사항
  - 전체 스크립트 보기 (토글 또는 섹션)
  - PDF 내보내기 버튼 (선택적 props 또는 내부 구현)

### 2. 유틸리티 함수 분리
마크다운 형태의 요약 텍스트를 구조화된 데이터(`SttResultData`)로 파싱하는 로직을 분리하여 두 페이지에서 공통으로 사용할 수 있게 합니다.

#### [NEW] `frontend/src/utils/meetingUtils.ts`
- **이동 함수**: `parseSummaryMarkdown`
- **역할**: 백엔드에서 받은 마크다운 문자열과 전체 텍스트를 입력받아 UI 렌더링에 필요한 객체로 변환합니다.

### 3. 기존 업로드 페이지 리팩토링
#### [MODIFY] `frontend/src/uploadPage/components/SttConversion.tsx`
- 내부의 결과 렌더링 코드를 제거하고, 새로 생성한 `<MeetingResultDisplay />` 컴포넌트를 사용하도록 변경합니다.
- PDF 저장 로직을 `MeetingResultDisplay` 내부로 옮기거나, props로 전달하여 유지합니다.

### 4. 실시간 녹음 페이지 UI 적용
#### [MODIFY] `frontend/src/liveStt/LiveSttPage.tsx`
- 기존의 단순 텍스트 박스 형태의 'AI 요약' 영역을 `<MeetingResultDisplay />` 컴포넌트로 교체합니다.
- 'AI 요약하기' 또는 녹음 종료 후 분석이 완료되었을 때, 결과 데이터를 `MeetingResultDisplay`에 전달하여 같은 양식으로 보여줍니다.
- 실시간 자막 (`transcripts`) 내용은 `fullText`로 전달하고, 요약 내용은 파싱하여 구조화된 데이터로 전달합니다.

## 검증 계획

### 1. 업로드 페이지 테스트
- 파일 업로드 및 분석 완료 후, 기존과 **동일한 디자인**으로 결과가 표시되는지 확인합니다.
- PDF 내보내기 기능이 여전히 정상 작동하는지 확인합니다.

### 2. 실시간 녹음 페이지 테스트
- 녹음 후 'AI 요약' 또는 분석 완료 시, 업로드 페이지와 **동일한 스타일**의 회의록 UI가 나타나는지 확인합니다.
- 가짜 데이터(Mock Data) 또는 실제 분석 데이터가 각 섹션(요약, 결정사항 등)에 올바르게 매핑되는지 확인합니다.
