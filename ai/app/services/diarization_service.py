import os
import torch
from pyannote.audio import Pipeline
from dotenv import load_dotenv

load_dotenv()

class DiarizationService:
    """Speaker Diarization Service using pyannote.audio"""
    
    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if DiarizationService._initialized:
            return
        
        # Load Hugging Face token from environment
        self.hf_token = os.getenv("HF_TOKEN")
        
        self.pipeline = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[DiarizationService] Using device: {self.device}")
        
        DiarizationService._initialized = True

    def load_model(self):
        """Lazy load the diarization pipeline"""
        if self.pipeline is not None:
            return

        if not self.hf_token:
            print("[DiarizationService] WARNING: HF_TOKEN not found in environment variables.")
            # We don't raise error here, but it will fail during pipeline call if not provided
        
        try:
            print("[DiarizationService] Loading pyannote/speaker-diarization-3.1")
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=self.hf_token
            )
            
            if self.pipeline:
                self.pipeline.to(self.device)
                print("[DiarizationService] Model loaded successfully!")
            else:
                print("[DiarizationService] Failed to load pipeline (returned None). Check HF_TOKEN and permissions.")
        except Exception as e:
            print(f"[DiarizationService] Error loading model: {e}")
            raise e

    def diarize(self, audio_path: str):
        """
        Process audio file and return speaker segments
        """
        if self.pipeline is None:
            self.load_model()
            
        print(f"[DiarizationService] Processing: {audio_path}")
        diarization = self.pipeline(audio_path)
        
        results = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            results.append({
                "start": round(turn.start, 3),
                "end": round(turn.end, 3),
                "speaker": speaker
            })
            
        return results

    def diarize_and_transcribe(self, audio_path: str, whisper_model):
        """
        오디오 파일을 분석하여 화자 분리 및 각 구간별 정밀 텍스트 추출(Whisper)을 수행합니다.
        """
        if self.pipeline is None:
            self.load_model()
            
        print(f"[DiarizationService] 정밀 분석 시작 (Diarization + Whisper): {audio_path}")
        diarization = self.pipeline(audio_path)
        
        results = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            # faster-whisper의 clip_timestamps를 활용하여 화자별 구간만 전사
            segments, _ = whisper_model.model.transcribe(
                audio_path, 
                language="ko",
                clip_timestamps=f"{turn.start},{turn.end}"
            )
            
            segment_text = " ".join([s.text for s in segments]).strip()
            
            if segment_text: # 텍스트가 있는 경우만 포함
                results.append({
                    "start": round(turn.start, 3),
                    "end": round(turn.end, 3),
                    "speaker": speaker,
                    "text": segment_text
                })
            
        return results

# global instance
_diarization_service = None

def get_diarization_service() -> DiarizationService:
    global _diarization_service
    if _diarization_service is None:
        _diarization_service = DiarizationService()
    return _diarization_service
