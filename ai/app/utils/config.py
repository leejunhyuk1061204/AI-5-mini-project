import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
UPLOAD_DIR = "uploads/audio"
