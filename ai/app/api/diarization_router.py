from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import List
import tempfile
import time
from pathlib import Path
from app.services.diarization_service import get_diarization_service

router = APIRouter(prefix="/api/v1", tags=["diarization"])

class DiarizationSegment(BaseModel):
    start: float = Field(..., description="시작 시간 (초)")
    end: float = Field(..., description="종료 시간 (초)")
    speaker: str = Field(..., description="화자 식별값")

class DiarizationResponse(BaseModel):
    segments: List[DiarizationSegment]
    count: int
    took_ms: int

@router.post("/diarize", response_model=DiarizationResponse)
async def diarize_audio(file: UploadFile = File(..., description="음성 파일 (wav, mp3 등)")):
    """
    음성 파일에서 화자를 분리하고 각 화자의 발화 구간을 반환합니다.
    """
    start_time = time.time()
    
    # 확장자 체크
    allowed_extensions = {".wav", ".mp3", ".m4a", ".flac"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. ({file_ext})"
        )

    try:
        service = get_diarization_service()
        
        # 임시 파일 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            # 화자 분리 실행
            segments_data = service.diarize(tmp_path)
            
            segments = [DiarizationSegment(**s) for s in segments_data]
            took_ms = int((time.time() - start_time) * 1000)

            return DiarizationResponse(
                segments=segments,
                count=len(segments),
                took_ms=took_ms
            )
        finally:
            # 임시 파일 삭제
            Path(tmp_path).unlink(missing_ok=True)

    except Exception as e:
        print(f"[DiarizationRouter] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"화자 분리 처리 중 오류 발생: {str(e)}"
        )

def load_model():
    """서버 시작 시 모델 미리 로드 (lifespan에서 호출)"""
    try:
        service = get_diarization_service()
        service.load_model()
    except Exception as e:
        print(f"[DiarizationRouter] Model preload failed: {e}")
