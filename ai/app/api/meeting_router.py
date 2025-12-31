# 엔드포인트 정의

from fastapi import APIRouter

router = APIRouter(prefix="/api/meeting", tags=["meeting"])

@router.post("/upload")
def upload():
    return {"message": "upload ok"}

@router.post("/generate")
def generate():
    return {"message": "generate ok"}
