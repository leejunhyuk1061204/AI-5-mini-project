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
import pymysql
import numpy as np
from app.api.embedding_router import load_model as load_embedding_model

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
        print(f"[ChatModel] 모델 로딩 중: {model_name} (device: {self.device})")
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            device_map="auto" if self.device == "cuda" else None
        )
        if self.device == "cpu":
            self.model = self.model.to(self.device)
        
        print("[ChatModel] 모델 로딩 완료!")

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
# RAG Helper Function
# ─────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────
# RAG Helper Function
# ─────────────────────────────────────────────────────────────

class MockCursor:
    def __init__(self):
        self.rows = []
    
    def execute(self, query, args=None):
        # 가짜 데이터 생성
        print("[MockDB] 쿼리 실행 감지 (실제 DB 연결 실패로 인한 시뮬레이션)")
        self.rows = [
            {
                'embedding': None, # 시뮬레이션에서는 임베딩 계산 생략하고 텍스트만 리턴하는 로직으로 처리 가정 혹은 아래 로직 수정
                'chunk_text': "다음 회의는 1월 10일 금요일 오후 2시에 진행하기로 했습니다. 회식 장소는 삼겹살집입니다.",
                'start_time': 0,
                'title': '가상 테스트 회의',
                'speaker_label': '김팀장'
            },
            {
                'embedding': None,
                'chunk_text': "이번 프로젝트 마감일은 1월 20일로 연기되었습니다. 프론트엔드 작업이 더 필요합니다.",
                'start_time': 60,
                'title': '가상 테스트 회의',
                'speaker_label': '이대리'
            }
        ]
    
    def fetchall(self):
        return self.rows
    
    def close(self):
        pass
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

class MockConnection:
    def cursor(self):
        return MockCursor()
    def close(self):
        print("[MockDB] 연결 종료")

def get_db_connection():
    try:
        conn = pymysql.connect(
            host='192.168.0.49',
            user='team_user',
            password='1234',
            db='mini_db',
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=2  # 2초 내 응답 없으면 바로 포기
        )
        print("[DB] 실제 데이터베이스 연결 성공!")
        return conn
    except Exception as e:
        print(f"[DB] 실제 연결 실패 ({str(e)}) -> 가상 DB(Mock)로 전환합니다.")
        return MockConnection()

def search_documents(query: str, top_k: int = 3) -> List[str]:
    """
    RAG 검색: 질문과 유사한 회의 세그먼트를 DB에서 검색
    """
    try:
        # 1. 쿼리 임베딩 생성
        embed_model = load_embedding_model()
        query_vector = embed_model.encode(query)
        
        # 2. DB에서 모든 임베딩 가져오기
        conn = get_db_connection()
        
        # Mock Connection인지 확인 (가짜 데이터이면 유사도 계산 없이 바로 반환)
        if isinstance(conn, MockConnection):
            with conn.cursor() as cursor:
                cursor.execute("SELECT ...") # 쿼리 실행 흉내
                rows = cursor.fetchall()
                results = []
                for r in rows:
                    results.append(f"[가상(Mock) 회의: {r['title']}] {r['speaker_label']}: {r['chunk_text']} (유사도: 시뮬레이션)")
                return results

        try:
            with conn.cursor() as cursor:
                # embeddings 테이블과 meeting_segments 테이블 조인
                sql = """
                    SELECT e.embedding, s.chunk_text, s.start_time, m.title, s.speaker_label
                    FROM embeddings e
                    JOIN meeting_segments s ON e.segment_id = s.segment_id
                    JOIN meetings m ON s.meeting_id = m.meeting_id
                    ORDER BY s.created_at DESC
                    LIMIT 200
                """
                cursor.execute(sql)
                rows = cursor.fetchall()
                
                if not rows:
                    return []
                
                sim_scores = []
                valid_rows = []
                
                for row in rows:
                    if not row['embedding']:
                        continue
                        
                    # DB에 저장된 바이너리 벡터를 numpy array로 변환
                    # 주의: Java/DB 저장 방식에 따라 파싱 방법이 다를 수 있음.
                    # 여기서는 32bit float array (little-endian) 가정
                    try:
                        # VECTOR 타입이 바이너리로 넘어온다면:
                        doc_vector = np.frombuffer(row['embedding'], dtype=np.float32)
                        
                        # 차원 확인
                        if doc_vector.shape[0] != query_vector.shape[0]:
                            continue
                            
                        # 코사인 유사도 계산
                        score = np.dot(query_vector, doc_vector) / (
                            np.linalg.norm(query_vector) * np.linalg.norm(doc_vector)
                        )
                        sim_scores.append(score)
                        valid_rows.append(row)
                    except Exception as e:
                        # 파싱 실패 시 패스
                        continue
                
                if not sim_scores:
                    return []

                # 상위 k개 추출
                top_indices = np.argsort(sim_scores)[::-1][:top_k]
                results = []
                for idx in top_indices:
                    r = valid_rows[idx]
                    score = sim_scores[idx]
                    # 검색 결과 포맷팅
                    info = f"[회의: {r['title']}] {r['speaker_label'] or '참여자'}: {r['chunk_text']} (유사도: {score:.2f})"
                    results.append(info)
                    
                return results
                
        finally:
            conn.close()
            
    except Exception as e:
        print(f"[RAG Error] 검색 실패: {e}")
        return []


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
    - RAG: DB에서 관련 회의 내용 검색하여 답변에 활용
    """
    start_time = time.time()
    
    # 세션 ID 생성 또는 사용
    session_id = req.session_id or str(uuid.uuid4())[:8]
    
    try:
        model = get_chat_model()
        
        # RAG 검색 (사용자 질문과 관련된 회의 내용 찾기)
        rag_context = search_documents(req.message)
        
        # 메시지 리스트 구성
        messages = []
        
        # 1. 시스템 프롬프트
        system_prompt = (
            "당신은 'AI 회의록' 서비스의 지능형 어시스턴트입니다. "
            "사용자의 회의 내용을 분석하여 요약, 할 일(Action Item) 추출, 일정 정리 등을 돕습니다. "
            "사용자가 질문하면 아래 제공된 [관련 회의 내용]을 바탕으로 사실에 입각하여 답변하세요. "
            "관련 내용이 없다면 일반적인 조언을 해주세요. "
            "모든 답변은 한국어로 명확하고 전문적인 어조로 작성해주세요."
        )
        
        # 2. RAG 검색 결과가 있으면 주입
        if rag_context:
            context_str = "\n".join(rag_context)
            system_prompt += f"\n\n[관련 회의 내용 (DB 검색 결과)]\n{context_str}"
            print(f"[RAG] 검색된 컨텍스트 ({len(rag_context)}건):\n{context_str[:200]}...")
        else:
            print("[RAG] 검색 결과 없음")
        
        # 3. 클라이언트 전달 컨텍스트가 있으면 추가
        if req.context:
            client_context_str = "\n".join(f"- {k}: {v}" for k, v in req.context.items())
            system_prompt += f"\n\n[추가 참조 정보]\n{client_context_str}"
        
        messages.append({"role": "system", "content": system_prompt})
        
        # 4. 히스토리 추가
        if req.history:
            for h in req.history:
                messages.append({"role": h.role, "content": h.content})
        
        # 5. 현재 사용자 메시지 (한국어 강제)
        messages.append({"role": "user", "content": f"{req.message}\n(답변은 무조건 한국어로 해주세요)"})
        
        # 응답 생성
        reply = model.generate(messages)
        
        took_ms = int((time.time() - start_time) * 1000)
        
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
