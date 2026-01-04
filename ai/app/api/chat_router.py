"""
챗봇 API 라우터 - Qwen3-0.6B 모델 사용
POST /api/chat 엔드포인트 제공
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time
import uuid
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

router = APIRouter(prefix="/api", tags=["chat"])

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
    """Qwen3-0.6B 모델 래퍼 - 한 번만 로드"""
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
        
        model_name = "Qwen/Qwen3-0.6B"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[ChatModel] Loading model: {model_name} (device: {self.device})")
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            device_map="auto" if self.device == "cuda" else None
        )
        if self.device == "cpu":
            self.model = self.model.to(self.device)
        
        print("[ChatModel] Model loading complete!")

    def generate(self, messages: List[Dict[str, str]]) -> str:
        """메시지 리스트를 받아 응답 생성"""
        input_text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        inputs = self.tokenizer(input_text, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.7,
                top_p=0.9,
                repetition_penalty=1.1,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
        
        response = self.tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:],
            skip_special_tokens=True
        )
        return response.strip()


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
    print(f"[Chat] Request received - session_id: {session_id}")
    
    try:
        model = get_chat_model()
        
        # 메시지 리스트 구성
        messages = []
        
        # 1. 시스템 프롬프트
        system_prompt = (
            "당신은 'AI 회의록' 서비스의 지능형 어시스턴트입니다.\n"
            "사용자의 제공된 [참조 컨텍스트]를 바탕으로 질문에 답변해야 합니다.\n"
            "만약 질문에 대한 답이 [참조 컨텍스트]에 없다면, 외부 지식을 사용하기보다 "
            "'제공된 회의 내용에서는 해당 정보를 찾을 수 없습니다'라고 정직하게 답변해 주세요.\n"
            "회의 내용을 바탕으로 요약, 할 일(Action Item) 추출, 일정 정리 등을 명확히 수행하세요.\n"
            "모든 답변은 한국어로 명확하고 전문적인 어조로 작성해야 합니다."
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
        
        # 응답 생성
        print(f"[Chat] Generating reply...")
        reply = model.generate(messages)
        
        took_ms = int((time.time() - start_time) * 1000)
        print(f"[Chat] Reply complete - took: {took_ms}ms")
        
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
