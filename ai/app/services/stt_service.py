from app.models.whisper_service import WhisperService

def speech_to_text(audio_path: str) -> str:
    """
    음성 파일(mp3/m4a/wav 등) → 텍스트로 변환 (Faster-Whisper 활용)
    """
    try:
        # 모델 로드 (상황에 따라 CPU/GPU 자동 선택)
        service = WhisperService(model_size="base", device="cpu", compute_type="int8")
        segments, info = service.transcribe(audio_path)
        
        # 세그먼트들을 결합하여 전체 텍스트 생성
        transcript = " ".join([segment.text.strip() for segment in segments])
        return transcript
    except Exception as e:
        print(f"STT 처리 중 오류 발생: {e}")
        return ""
