from google import genai
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.getcwd(), 'ai', '.env'))
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("API Key not found in ai/.env")
else:
    client = genai.Client(api_key=api_key)
    print("Available models:")
    try:
        # 최신 라이브러리 방식의 모델 리스트 조회
        for m in client.models.list():
            print(f"- {m.name}")
    except Exception as e:
        print(f"Error listing models: {e}")
