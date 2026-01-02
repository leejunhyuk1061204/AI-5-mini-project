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

# global instance
_diarization_service = None

def get_diarization_service() -> DiarizationService:
    global _diarization_service
    if _diarization_service is None:
        _diarization_service = DiarizationService()
    return _diarization_service
