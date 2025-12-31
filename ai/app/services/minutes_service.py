import json
from app.services.llm_service import generate_text
from app.prompts.meeting_prompt import MEETING_MINUTES_PROMPT

def generate_meeting_minutes(transcript: str) -> dict:
    """
    STT 결과 → 구조화된 회의록 생성
    """
    prompt = MEETING_MINUTES_PROMPT.format(transcript=transcript)
    llm_response = generate_text(prompt)
    
    try:
        # 응답에서 JSON 부분만 추출 (가끔 LLM이 ```json ... ``` 을 포함할 수 있음)
        if "```json" in llm_response:
            llm_response = llm_response.split("```json")[-1].split("```")[0]
        
        minutes_data = json.loads(llm_response)
        return minutes_data
    except Exception as e:
        print(f"Error parsing meeting minutes JSON: {e}")
        # 실패 시 기본 구조 반환
        return {
            "description": "회의록 생성에 실패했습니다.",
            "core_summary": [],
            "meeting_type": "알 수 없음",
            "topics": [],
            "decisions": [],
            "action_items": [],
            "pending_items": ["회의록 파싱 실패"]
        }
