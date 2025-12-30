from google import genai
from app.utils.config import GEMINI_API_KEY

def generate_text(prompt: str) -> str:
    """
    프롬프트 → LLM 응답 (Google Gemini 최신 라이브러리 활용)
    """
    if not GEMINI_API_KEY:
        print("GEMINI_API_KEY가 설정되지 않았습니다.")
        return ""

    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # 사용 가능한 모델 후보들 (사용자 환경의 list_models 결과 반영)
    model_candidates = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash", "gemini-pro-latest"]
    
    for model_name in model_candidates:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            return response.text
        except Exception as e:
            print(f"Attempt with {model_name} failed: {e}")
            continue
            
    print("모든 Gemini 모델 시도가 실패했습니다.")
    return ""
