import sys
import os
import json

# ai 경로 추가
sys.path.append(os.path.join(os.getcwd(), 'ai'))

from app.services.stt_service import speech_to_text
from app.services.minutes_service import generate_meeting_minutes
from app.services.embedding_service import embedding_service

def process_meeting_audio(audio_path: str):
    """
    1. STT를 통해 음성을 텍스트로 변환
    2. 변환된 텍스트를 분류/요약하여 회의록 생성
    3. 텍스트를 청크 단위로 나누고 임베딩 생성 (all-MiniLM-L6-v2)
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
    
    print("\n--- 🧬 3단계: 임베딩(Vector) 생성 시작 ---")
    # 텍스트 청크 분할
    chunks = embedding_service.chunk_text(transcript)
    # 각 청크별 임베딩 생성
    vectors = embedding_service.get_embeddings(chunks)
    
    embedding_data = [
        {"chunk": chunk, "vector": vector}
        for chunk, vector in zip(chunks, vectors)
    ]
    
    print(f"총 {len(chunks)}개의 청크에 대한 임베딩이 생성되었습니다.")

    # 최종 결과 구성
    final_output = {
        "audio_file": os.path.basename(audio_path),
        "transcript": transcript,
        "minutes": minutes,
        "embeddings": embedding_data
    }

    print("\n--- ✅ 최종 결과 (분류된 회의록 및 임베딩) ---")
    # print(json.dumps(final_output, indent=4, ensure_ascii=False)) # 출력이 너무 길어질 수 있어 생략
    
    # 결과를 파일로 저장
    output_path = audio_path.replace(".wav", "_result.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final_output, f, indent=4, ensure_ascii=False)
    print(f"\n결과가 저장되었습니다: {output_path}")

if __name__ == "__main__":
    # 사용자 요청 파일 경로
    audio_file = r"ai/tests/test_audio.wav"
    process_meeting_audio(audio_file)
