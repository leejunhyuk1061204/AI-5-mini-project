# backend/app/api/meeting_router.py

from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil

from app.services.stt_service import speech_to_text 

router = APIRouter(prefix="/api/meeting", tags=["meeting"])

# 업로드 저장 폴더
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads" / "audio"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_last_uploaded_path: Path | None = None


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    """
    오디오 파일 업로드:
    - multipart/form-data로 file 필드 받음
    - uploads/audio/에 저장
    - 저장된 경로 반환
    """
    global _last_uploaded_path

    if not file.filename:
        raise HTTPException(status_code=400, detail="파일 이름이 없습니다.")

    save_path = UPLOAD_DIR / file.filename

    try:
        with save_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 실패: {e}")
    finally:
        file.file.close()

    _last_uploaded_path = save_path

    return {
        "message": "upload ok",
        "filename": file.filename,
        "file_path": str(save_path),
    }


@router.post("/generate")
async def generate():
    """
    회의록 생성:
    - 마지막 업로드된 파일이 있어야 함
    - STT 실행 후 요약 반환
    """
    if _last_uploaded_path is None or not _last_uploaded_path.exists():
        raise HTTPException(status_code=400, detail="업로드된 파일이 없습니다. 먼저 /upload를 호출하세요.")

    audio_path = str(_last_uploaded_path)

    try:
        # 실제 STT 실행
        transcript: str = speech_to_text(audio_path)

      
        summary = transcript[:800] + ("..." if len(transcript) > 800 else "")

        return {
            "message": "generate ok",
            "input_file": audio_path,
            "transcript": transcript,
            "summary": summary,
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"generate 실패: {e}")
