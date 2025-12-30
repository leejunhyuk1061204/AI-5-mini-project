import sys
import os
import json

# backend 경로 추가
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.stt_service import speech_to_text
from app.services.minutes_service import generate_meeting_minutes

def process_meeting_audio(audio_path: str):
    """
    1. STT를 통해 음성을 텍스트로 변환
    2. 변환된 텍스트를 분류/요약하여 회의록 생성
    """
    if not os.path.exists(audio_path):
        print(f"오류: 파일을 찾을 수 없습니다 -> {audio_path}")
        return

    print(f"--- 🎤 1단계: 음성 전사 시작 ({os.path.basename(audio_path)}) ---")
    transcript = speech_to_text(audio_path)
    
    if not transcript:
        print("오류: 음성 전사에 실패했습니다.")
        return

    print("\n--- 📝 전사 결과 ---")
    print(transcript)

    print("\n--- 🤖 2단계: 문장 분류 및 요약 시작 (Gemini) ---")
    minutes = generate_meeting_minutes(transcript)
    
    print("\n--- ✅ 최종 결과 (분류된 회의록) ---")
    print(json.dumps(minutes, indent=4, ensure_ascii=False))
    
    # 결과를 파일로 저장
    output_path = audio_path.replace(".wav", "_result.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(minutes, f, indent=4, ensure_ascii=False)
    print(f"\n결과가 저장되었습니다: {output_path}")

if __name__ == "__main__":
    # 사용자 요청 파일 경로
    audio_file = r"backend/tests/test_audio.wav"
    process_meeting_audio(audio_file)
