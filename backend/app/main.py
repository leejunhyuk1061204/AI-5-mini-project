# 같은 환경을 바로 재현하기 위함
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  
from dotenv import load_dotenv

load_dotenv()

import os
print("OPENAI_API_KEY loaded?", bool(os.getenv("OPENAI_API_KEY")))


from app.api.meeting_router import router as meeting_router

app = FastAPI(title="AI Meeting Minutes API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 기존 라우터 등록 유지
app.include_router(meeting_router, prefix="/api/meeting")
