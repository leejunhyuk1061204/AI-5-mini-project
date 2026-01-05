"""
챗봇 API 라우터 - Qwen3-1.7B-GGUF 모델 사용
POST /api/chat 엔드포인트 제공
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time
import uuid

import asyncio
import logging
import re
from app.utils.model_loader import get_llm


router = APIRouter(prefix="/api", tags=["chat"])
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Pydantic 모델 정의
# ─────────────────────────────────────────────────────────────

class HistoryMessage(BaseModel):
    """대화 히스토리의 단일 메시지"""
    role: str = Field(..., description="system, user, 또는 assistant")
    content: str = Field(..., description="메시지 내용")


class ChatRequest(BaseModel):
    """채팅 요청 스키마"""
    session_id: Optional[str] = Field(None, description="세션 ID (없으면 자동 생성)")
    message: str = Field(..., description="사용자 메시지")
    history: Optional[List[HistoryMessage]] = Field(None, description="이전 대화 기록")
    context: Optional[Dict[str, Any]] = Field(None, description="참조 컨텍스트 (예: 프로젝트 정보)")


class ChatResponse(BaseModel):
    """채팅 응답 스키마"""
    session_id: str = Field(..., description="세션 ID")
    reply: str = Field(..., description="AI 응답")
    took_ms: int = Field(..., description="처리 시간 (밀리초)")


# ─────────────────────────────────────────────────────────────
# 모델 관리 클래스 (싱글톤 패턴)
# ─────────────────────────────────────────────────────────────

class ChatModel:
    """GGUF 모델을 사용하는 챗봇 래퍼"""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if ChatModel._initialized:
            return
        ChatModel._initialized = True

        # 모델은 model_loader에서 관리함
        logger.info("[ChatModel] Initialized with GGUF loader")

    def generate(self, messages: List[Dict[str, str]]) -> str:
        """메시지 리스트를 받아 응답 생성 (llama-cpp-python 사용)"""
        llm = get_llm()
        
        # llama-cpp-python의 create_chat_completion 사용
        # Qwen3-Instruct 모델은 내부적으로 chat_template을 처리함
        response = llm.create_chat_completion(
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
            top_p=0.9,
            repeat_penalty=1.1,
            stream=False
        )
        
        reply = response["choices"][0]["message"]["content"]
        
        # 사고 과정(<think>...</think>) 제거 (프론트 디자인에 따라 유지할 수도 있지만 현재는 제거)
        reply = re.sub(r'<(think|thought)>.*?(</\1>|$)', '', reply, flags=re.DOTALL | re.IGNORECASE)
        return reply.strip()


# 모델 인스턴스 (서버 시작 시 한 번만 로드)
_chat_model: Optional[ChatModel] = None


def load_model():
    """모델 명시적 로드"""
    get_chat_model()

def get_chat_model() -> ChatModel:
    """싱글톤 모델 인스턴스 반환"""
    global _chat_model
    if _chat_model is None:
        _chat_model = ChatModel()
    return _chat_model


# ─────────────────────────────────────────────────────────────
# 엔드포인트
# ─────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    챗봇 대화 엔드포인트
    
    - 한국어로 응답하는 개발자 어시스턴트
    - context가 있으면 참조 정보로 활용
    - history가 있으면 대화 맥락 유지
    """
    start_time = time.time()
    
    # 세션 ID 생성 또는 사용
    session_id = req.session_id or str(uuid.uuid4())[:8]
    logger.info(f"[Chat] Request received - session_id: {session_id}")
    
    try:
        model = get_chat_model()
        
        # 메시지 리스트 구성
        messages = []
        
        # 1. 시스템 프롬프트
        system_prompt = (
            "당신은 'AI 회의록' 서비스의 지능형 어시스턴트입니다.\n"
            "사용자의 질문에 대해 [참조 컨텍스트]를 최우선으로 사용하여 답변하세요.\n"
            "단, 다음과 같은 지침을 '반드시' 따르세요:\n"
            "1. 모든 답변은 반드시 한국어(Korean)로만 작성하세요. 영어를 섞지 마세요.\n"
            "2. 당신의 생각(thought, reasoning)이나 과정은 절대 답변에 포함하지 마세요. 오직 최종 답변만 출력하세요.\n"
            "3. 질문에 대한 답이 [참조 컨텍스트]에 없다면, 해당 정보가 없음을 정중히 알리세요.\n"
            "4. 요약이나 할 일(Action Item)은 나열할 때 **글머리 기호(-)**를 사용하세요.\n"
            "5. '안녕'과 같은 인사에는 친절하게 한국어로 응대하세요."
        )
        
        # 2. 컨텍스트가 있으면 시스템 프롬프트에 추가
        if req.context and "retrieved_segments" in req.context:
            segments = req.context["retrieved_segments"]
            context_str = "\n".join([f"- {s}" for s in segments])
            system_prompt += f"\n\n[참조 컨텍스트 (회의 내용)]\n{context_str}"
        elif req.context:
            context_str = "\n".join(f"- {k}: {v}" for k, v in req.context.items())
            system_prompt += f"\n\n[참조 컨텍스트]\n{context_str}"
        
        messages.append({"role": "system", "content": system_prompt})
        
        # 3. 히스토리 추가
        if req.history:
            for h in req.history:
                messages.append({"role": h.role, "content": h.content})
        
        # 4. 현재 사용자 메시지
        messages.append({"role": "user", "content": req.message})
        
        # 응답 생성 (비동기 처리)
        logger.info(f"[Chat] Generating reply...")
        loop = asyncio.get_event_loop()
        reply = await loop.run_in_executor(None, model.generate, messages)
        
        took_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[Chat] Reply complete - took: {took_ms}ms")
        
        return ChatResponse(
            session_id=session_id,
            reply=reply,
            took_ms=took_ms
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"모델 생성 중 오류 발생: {str(e)}"
        )
