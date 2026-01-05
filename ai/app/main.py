import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# [Patch] Torchaudio 2.6+ 호환성 패치 (pyannote.audio에서 사용) -> 반드시 다른 앱 import 전에 실행되어야 함
import torchaudio
if not hasattr(torchaudio, "set_audio_backend"):
    torchaudio.set_audio_backend = lambda x: None
if not hasattr(torchaudio, "get_audio_backend"):
    torchaudio.get_audio_backend = lambda: None

from app.api.chat_router import router as chat_router
from app.api.chat_router import load_model
from app.api.summarize import router as summarize_router
from app.api.sbert_router import router as sbert_router
from app.api.sbert_router import load_sbert_model
from app.api.whisper_router import router as whisper_router
from app.api.whisper_router import load_model as load_whisper_model
from app.api.diarization_router import router as diarization_router
from app.api.diarization_router import load_model as load_diarization_model



# 로깅 설정
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "ai_log.log")

from logging.handlers import RotatingFileHandler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        RotatingFileHandler(
            LOG_FILE, 
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,          # Keep 5 backup files (Total ~50MB)
            encoding='utf-8'
        ),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ai_server")

# print() 문들을 로그 파일로 리다이렉션 (선택 사항 - 기존 print문 보존용)
import sys
class LoggerWriter:
    def __init__(self, logf, original_stream):
        self.logf = logf
        self.original_stream = original_stream
    def write(self, message):
        if message.strip():
            self.logf.info(message.strip())
        self.original_stream.write(message)
    def flush(self):
        self.original_stream.flush()

sys.stdout = LoggerWriter(logger, sys.stdout)
sys.stderr = LoggerWriter(logger, sys.stderr)

# [Av] libav(FFmpeg) 로깅 레벨 조정 (오디오 청크 연결 시 발생하는 benign 에러 숨김)
try:
    import av
    av.logging.set_level(av.logging.CRITICAL)
except ImportError:
    pass

async def lifespan(app: FastAPI):
    # Startup
    print("\n" + "="*50, flush=True)
    print("[STARTUP] AI Meeting Minutes Server starting...", flush=True)
    print("[STARTUP] Loading AI models... Please wait...", flush=True)
    try:
        load_model()             # Chat Model
        load_sbert_model()        # SBERT Model
        load_whisper_model()      # Whisper Model
        load_diarization_model()  # Diarization Model (NEW)
        print("[OK] All models loaded successfully!", flush=True)
    except Exception as e:
        print(f"[ERROR] Model loading failed: {e}", flush=True)
    print("[STARTUP] Server is ready to accept requests on port 8001", flush=True)
    print("="*50 + "\n", flush=True)
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
app.include_router(diarization_router)


