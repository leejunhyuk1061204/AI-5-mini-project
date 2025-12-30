import sys
import os

# backend 경로 추가
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.minutes_service import generate_meeting_minutes

def test_minutes_generation():
    test_transcript = """
    [0.00s -> 3.78s]  오늘 회의 목표는 다음주 프로젝트 1점 조율입니다.
    [3.78s -> 8.52s]  김팀장은 다음주 금요일까지 보고서를 제출하기로 결정했습니다.
    [8.52s -> 12.06s]  이번 서버 오류 문제는 해결방안을 논의해야 합니다.
    [12.06s -> 16.50s]  박대리는 고객문의 답변 작업을 이번 주 안에 마무리해야 합니다.
    [16.50s -> 20.26s]  모두 지난주 진행 상황에 대해 간단히 공유해 주세요.
    [20.26s -> 25.26s]  디자인팀은 새로운 UI 시안을 다음 회의 전까지 준비하기로 했습니다.
    [25.26s -> 28.74s]  로그 분석 과정에서 데이터 누락이 발견되었습니다.
    """
    
    print("--- 테스트용 전사 데이터 ---")
    print(test_transcript)
    
    print("\n--- 회의록 생성 중... ---")
    # 실제 API 호출이므로 환경 변수 OPENAI_API_KEY가 설정되어 있어야 함
    try:
        minutes = generate_meeting_minutes(test_transcript)
        print("\n--- 생성된 회의록 결과 ---")
        import json
        print(json.dumps(minutes, indent=4, ensure_ascii=False))
    except Exception as e:
        print(f"테스트 실패: {e}")

if __name__ == "__main__":
    test_minutes_generation()
