"""
FastAPI 음성 요약 API
- 음성 파일을 받아 Whisper로 텍스트 변환
- Qwen2.5-0.5B-Instruct로 요약하여 반환
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
import tempfile
import os

# 로컬 모듈 임포트
from whisper import transcribe_audio
from summarize import MeetingSummarizer

app = FastAPI(
    title="음성 요약 API",
    description="음성 파일을 텍스트로 변환하고 요약합니다.",
    version="1.0.0"
)

# CORS 설정 - Netlify 프론트엔드 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 오리진 허용 (개발용)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 인스턴스 (서버 시작 시 로드)
summarizer = None


class SummaryResponse(BaseModel):
    """요약 응답 모델"""
    success: bool
    transcription: str
    summary: Dict[str, Any]


class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool
    error: str


@app.on_event("startup")
async def startup_event():
    """서버 시작 시 모델 로드"""
    global summarizer
    print("Qwen2.5-0.5B-Instruct 모델 로딩 중...")
    summarizer = MeetingSummarizer()
    print("모델 로딩 완료!")


@app.get("/")
async def root():
    """헬스 체크 엔드포인트"""
    return {"status": "ok", "message": "음성 요약 API가 실행 중입니다."}


@app.post("/api/summarize", response_model=SummaryResponse)
async def summarize_audio(file: UploadFile = File(...)):
    """
    음성 파일을 받아 텍스트로 변환하고 요약합니다.
    
    - **file**: 음성 파일 (mp3, wav, m4a, mp4, flac, ogg 등)
    
    Returns:
        - transcription: 변환된 텍스트
        - summary: 구조화된 요약 결과
    """
    global summarizer
    
    if summarizer is None:
        raise HTTPException(status_code=503, detail="모델이 아직 로딩되지 않았습니다.")
    
    # 지원하는 오디오 확장자
    allowed_extensions = {".mp3", ".wav", ".m4a", ".mp4", ".flac", ".ogg", ".webm"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"지원하지 않는 파일 형식입니다. 지원 형식: {', '.join(allowed_extensions)}"
        )
    
    try:
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # 1. Whisper로 텍스트 변환
            print(f"음성 변환 시작: {file.filename}")
            transcription = transcribe_audio(tmp_path)
            print(f"변환 완료: {len(transcription)} 글자")
            
            # 2. Qwen으로 요약
            print("요약 생성 중...")
            summary = summarizer.summarize(transcription)
            print("요약 완료!")
            
            return SummaryResponse(
                success=True,
                transcription=transcription,
                summary=summary
            )
            
        finally:
            # 임시 파일 삭제
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"처리 중 오류 발생: {str(e)}")


@app.post("/api/transcribe")
async def transcribe_only(file: UploadFile = File(...)):
    """
    음성 파일을 텍스트로만 변환합니다 (요약 없음).
    """
    allowed_extensions = {".mp3", ".wav", ".m4a", ".mp4", ".flac", ".ogg", ".webm"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다."
        )
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            transcription = transcribe_audio(tmp_path)
            return {"success": True, "transcription": transcription}
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
