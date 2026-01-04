# 4단계: 화자 분리 및 최종 분석 (Diarization) - [진행 예정]

## 목표
회의가 종료되었을 때, 전체 녹음 파일을 분석하여 화자(Speaker)를 구분하고, 더 정교한 최종 회의록 및 요약을 생성합니다.

## 주요 변경 사항 (예정)

### 1. AI 서버 (Python FastAPI)
- `pyannote/speaker-diarization` 모델 도입
- 화자별 발화 시간대 추출 및 텍스트 매칭 로직 구현

### 2. 백엔드 (Java Spring Boot)
- 회의 종료 신호 수신 시 상태를 `ANALYZING`으로 변경
- AI 서버의 분석 결과를 바탕으로 `FinalSegment` 데이터 구축
- 회의 전체 요약(`summary`) 생성 및 상태를 `COMPLETED`로 변경

## 검증 계획
- 회의 종료 후 일정 시간 내에 화자 라벨(Speaker 0, Speaker 1 등)이 포함된 최종 회의록이 생성되는지 확인
