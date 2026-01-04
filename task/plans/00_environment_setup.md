# 0단계: 환경 설정 및 데이터 모델링

## 목표
로컬 개발 환경(MySQL 9.5, Python 3.12)을 구축하고, 회원(Member) 및 회의(Meeting) 관리를 위한 기본 JPA 엔티티를 생성합니다.

## 주요 변경 사항

### 1. 환경 설정
- **Backend**: `application-local.properties` 생성 및 `.gitignore` 등록 (로컬 DB 보안 유지)
- **AI Server**: Python 3.12 기반 Conda 가상환경(`ai-project`) 구축 및 `faster-whisper`, `fastapi` 등 필수 라이브러리 설치

### 2. 데이터베이스 설계 (JPA)
- **Members**: 사용자 정보 저장 (아이디, 비밀번호, 이메일)
- **Meetings**: 회의 정보 저장 (제목, 생성일, 상태, 요약, 전체 텍스트)
    - 상태(Status): `PROCEEDING`, `ANALYZING`, `COMPLETED`
- **Segments/Embeddings**: 실시간 세그먼트 및 벡터 데이터를 위한 스켈레톤 엔티티 정의

## 검증 계획
- `./gradlew bootRun`을 통해 스프링 부트 애플리케이션 정상 구동 확인
- AI 서버 `uvicorn` 실행 후 API 엔드포인트 접속 확인
