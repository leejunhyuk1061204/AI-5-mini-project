from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.meeting_router import router as meeting_router
from app.api.chat_router import router as chat_router
from app.api.chat_router import load_model

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("------------------------------------------------", flush=True)
    print("🚀 서버 시작: AI 모델을 로드합니다. 잠시만 기다려주세요...", flush=True)
    try:
        load_model()
        print("✅ 모델 로드 완료! 서버가 준비되었습니다.", flush=True)
    except Exception as e:
        print(f"❌ 모델 로드 실패: {e}", flush=True)
    print("------------------------------------------------", flush=True)
    yield
    # Shutdown
    print("🛑 서버 종료", flush=True)

app = FastAPI(title="AI Meeting Minutes API", lifespan=lifespan)

# Allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    # Allow all local development ports including Vite default
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:5173", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is running"}

app.include_router(meeting_router, prefix="/api/meeting")
app.include_router(chat_router)  # prefix="/api" already in router
