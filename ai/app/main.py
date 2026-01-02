from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.chat_router import router as chat_router
from app.api.chat_router import load_model
from app.api.whisper_router import router as whisper_router
from app.api.summarize import router as summarize_router
from app.api.sbert_router import router as sbert_router
from app.api.embedding_router import router as embedding_v2_router
from app.api.embedding_router import load_model as load_embedding_v2_model
# TODO: pyannote 설치 후 주석 해제
# from app.api.diarization_router import router as diarization_router
# from app.api.diarization_router import load_model as load_diarization_model

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("------------------------------------------------", flush=True)
    print("[STARTUP] Loading AI models... Please wait...", flush=True)
    try:
        load_model()
        load_embedding_v2_model()
        # load_diarization_model()  # TODO: pyannote 설치 후 주석 해제
        print("[OK] Models loaded! Server is ready.", flush=True)
    except Exception as e:
        print(f"[ERROR] Model loading failed: {e}", flush=True)
    print("------------------------------------------------", flush=True)
    yield
    # Shutdown
    print("[SHUTDOWN] Server stopping...", flush=True)

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

app.include_router(chat_router)  # prefix="/api" already in router
app.include_router(whisper_router)  # prefix="/api" already in router
app.include_router(summarize_router)  # prefix="/api" already in router
app.include_router(sbert_router)  # prefix="/api" already in router
app.include_router(embedding_v2_router) # prefix="/api/v2" already in router
# app.include_router(diarization_router)  # TODO: pyannote 설치 후 주석 해제


