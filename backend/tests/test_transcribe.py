import sys
import os

# 모델 경로 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app')))

from models.whisper_service import WhisperService

def test_transcribe(audio_path):
    print(f"Transcribing: {audio_path}")
    service = WhisperService(model_size="small", device="cpu", compute_type="int8")
    
    # 실제 음성 → 텍스트 변환
    segments, info = service.transcribe(audio_path)
    
    print("Transcription result:")
    for segment in segments:
        print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")

if __name__ == "__main__":
    audio_file = os.path.join(os.path.dirname(__file__), "test_audio.wav")
    test_transcribe(audio_file)