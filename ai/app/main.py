from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.meeting_router import router as meeting_router
from app.api.chat_router import router as chat_router

app = FastAPI(title="AI Meeting Minutes API")

# Allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meeting_router, prefix="/api/meeting")
app.include_router(chat_router)  # prefix="/api" already in router
