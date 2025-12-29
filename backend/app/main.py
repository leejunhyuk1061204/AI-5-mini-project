# 같은 환경을 바로 재현하기 위함
from fastapi import FastAPI
from app.api.meeting import router as meeting_router

app = FastAPI(title="AI Meeting Minutes API")

app.include_router(meeting_router, prefix="/api/meeting")
