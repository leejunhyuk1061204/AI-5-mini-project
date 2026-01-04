import os

# PyTorch 2.6+ 호환성: weights_only=False 강제 적용
# 방법 1: 환경변수 설정 (일부 버전에서 작동)
os.environ['TORCH_FORCE_WEIGHTS_ONLY_LOAD'] = '0'

import torch

# 방법 2: torch.load 함수 자체를 래핑하여 weights_only 강제 False
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    # 명시적으로 전달된 weights_only=True도 False로 덮어씀
    kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load

from pyannote.audio import Pipeline
from dotenv import load_dotenv
import av
import numpy as np
import soundfile as sf
import tempfile
from pathlib import Path

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

    def _ensure_wav(self, audio_path: str) -> str:
        """
        pyannote와 torchaudio가 인식하지 못하는 포맷(예: webm/opus)인 경우
        PyAV를 사용하여 16kHz wav로 변환한 후 임시 파일 경로를 반환합니다.
        가급적 원본 형식을 유지하되, 필요할 때만 변환합니다.
        """
        ext = Path(audio_path).suffix.lower()
        if ext in [".wav", ".flac"]:
            return audio_path

        print(f"[DiarizationService] Format {ext} might not be supported. Converting to wav...")
        try:
            container = av.open(audio_path)
            stream = container.streams.audio[0]
            
            # 16kHz Mono로 리샘플링 (AI 분석 표준)
            resampler = av.AudioResampler(
                format='s16',
                layout='mono',
                rate=16000,
            )
            
            audio_data = []
            for frame in container.decode(stream):
                frame.pts = None
                resampled_frames = resampler.resample(frame)
                for rf in resampled_frames:
                    audio_data.append(rf.to_ndarray())
            
            if not audio_data:
                print(f"[DiarizationService] No audio data found in {audio_path}")
                return audio_path

            # 모든 청크 결합
            audio_array = np.concatenate(audio_data, axis=1) # (1, samples)
            
            # 임시 wav 파일 생성
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_wav:
                tmp_wav_path = tmp_wav.name
            
            sf.write(tmp_wav_path, audio_array.flatten(), 16000)
            print(f"[DiarizationService] Converted to: {tmp_wav_path}")
            return tmp_wav_path
            
        except Exception as e:
            print(f"[DiarizationService] Conversion failed: {e}. Falling back to original.")
            return audio_path

    def diarize(self, audio_path: str):
        """
        Process audio file and return speaker segments
        """
        if self.pipeline is None:
            self.load_model()
            
        print(f"[DiarizationService] Processing: {audio_path}")
        
        # 포맷 변환 확인
        processed_path = self._ensure_wav(audio_path)
        
        try:
            diarization = self.pipeline(processed_path)
        finally:
            # 변환된 임시 파일인 경우 삭제
            if processed_path != audio_path:
                Path(processed_path).unlink(missing_ok=True)
        
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
        
        # 포맷 변환 확인 (pyannote용)
        processed_path = self._ensure_wav(audio_path)
        
        try:
            diarization = self.pipeline(processed_path)
            
            results = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                # faster-whisper의 clip_timestamps를 활용하여 화자별 구간만 전사
                # 변환된(안전한) WAV 파일을 사용하여 전사 수행 (원본 WebM 손상 대비)
                segments, _ = whisper_model.model.transcribe(
                    processed_path, 
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
        finally:
            if processed_path != audio_path:
                Path(processed_path).unlink(missing_ok=True)

# global instance
_diarization_service = None

def get_diarization_service() -> DiarizationService:
    global _diarization_service
    if _diarization_service is None:
        _diarization_service = DiarizationService()
    return _diarization_service
