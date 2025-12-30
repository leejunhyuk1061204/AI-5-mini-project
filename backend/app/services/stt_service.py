import os
from pathlib import Path
from openai import OpenAI

def speech_to_text(audio_path: str) -> str:
    """
    음성 파일(mp3/m4a/wav) → 텍스트 (OpenAI)
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다. backend/.env에 OPENAI_API_KEY=... 를 넣어주세요.")

    client = OpenAI(api_key=api_key)

    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    with audio_path.open("rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-transcribe",  # 또는 whisper-1
            file=audio_file
        )

    return transcript.text
``