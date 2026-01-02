"""
Whisper 음성 변환 API 라우터
POST /api/transcribe 엔드포인트 제공
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
import tempfile
import time
from pathlib import Path
from faster_whisper import WhisperModel

router = APIRouter(prefix="/api", tags=["whisper"])

# ─────────────────────────────────────────────────────────────
# Pydantic 모델 정의
# ─────────────────────────────────────────────────────────────

class TranscribeResponse(BaseModel):
    """음성 변환 응답 스키마"""
    text: str = Field(..., description="변환된 텍스트")
    language: str = Field(..., description="감지된 언어")
    duration: float = Field(..., description="오디오 길이 (초)")
    took_ms: int = Field(..., description="처리 시간 (밀리초)")


# ─────────────────────────────────────────────────────────────
# 모델 관리 클래스 (싱글톤 패턴)
# ─────────────────────────────────────────────────────────────

class WhisperModelWrapper:
    """Whisper 모델 래퍼 - 한 번만 로드"""
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if WhisperModelWrapper._initialized:
            return
        WhisperModelWrapper._initialized = True
        
        model_size = "small"
        print(f"[WhisperModel] 모델 로딩 중: {model_size}")
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
        print("[WhisperModel] 모델 로딩 완료!")

    def transcribe(self, audio_path: str) -> tuple:
        """음성 파일을 텍스트로 변환"""
        segments, info = self.model.transcribe(audio_path, language="ko")
        full_text = " ".join([segment.text for segment in segments])
        return full_text.strip(), info


_whisper_model = None

def get_whisper_model() -> WhisperModelWrapper:
    """싱글톤 모델 인스턴스 반환"""
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModelWrapper()
    return _whisper_model


# ─────────────────────────────────────────────────────────────
# 엔드포인트
# ─────────────────────────────────────────────────────────────

@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(..., description="음성 파일 (mp3, wav, m4a 등)")):
    """
    음성 파일을 텍스트로 변환하는 엔드포인트
    
    - 지원 형식: mp3, wav, m4a, mp4, flac, ogg 등
    - 한국어로 변환
    """
    start_time = time.time()
    
    # ===== 데이터 흐름 로그 =====
    print("="*60)
    print("🎤 [Python AI] Whisper API 요청 수신")
    print(f"   📁 파일명: {file.filename}")
    print(f"   📊 Content-Type: {file.content_type}")
    
    # 파일 확장자 확인
    allowed_extensions = {".mp3", ".wav", ".m4a", ".mp4", ".flac", ".ogg", ".webm"}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. 지원 형식: {', '.join(allowed_extensions)}"
        )
    
    try:
        model = get_whisper_model()
        
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        print(f"   💾 파일 크기: {len(content)} bytes")
        print(f"   🔄 Whisper 처리 시작...")
        
        try:
            # 음성 변환
            text, info = model.transcribe(tmp_path)
            
            took_ms = int((time.time() - start_time) * 1000)
            
            # ===== 결과 로그 =====
            print(f"   ✅ Whisper 처리 완료!")
            print(f"   📝 인식 결과: {text[:100]}{'...' if len(text) > 100 else ''}")
            print(f"   🌐 언어: {info.language}")
            print(f"   ⏱️  오디오 길이: {round(info.duration, 2)}초")
            print(f"   ⚡ 처리 시간: {took_ms}ms")
            print("="*60)
            
            return TranscribeResponse(
                text=text,
                language=info.language,
                duration=round(info.duration, 2),
                took_ms=took_ms
            )
        finally:
            # 임시 파일 삭제
            Path(tmp_path).unlink(missing_ok=True)
    
    except Exception as e:
        import traceback
        print("=" * 50)
        print("🚨 음성 변환 오류 발생!")
        print(f"   파일명: {file.filename}")
        print(f"   에러: {str(e)}")
        print("상세 스택트레이스:")
        traceback.print_exc()
        print("=" * 50)
        raise HTTPException(
            status_code=500,
            detail=f"음성 변환 중 오류 발생: {str(e)}"
        )
