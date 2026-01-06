"""
Ollama 기반 LLM 모델 로더
Qwen3-1.7B 모델을 Ollama API를 통해 호출
"""
import logging
import httpx
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Ollama 설정
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen3:1.7b"


class OllamaClient:
    """Ollama API 클라이언트"""
    
    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = OLLAMA_MODEL):
        self.base_url = base_url
        self.model = model
        self.client = httpx.Client(timeout=120.0)  # 응답 대기 시간 2분
        logger.info(f"[OllamaClient] Initialized with model: {model}")
    
    def create_chat_completion(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 0.9,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Ollama chat completion API 호출
        llama-cpp-python과 호환되는 응답 형식 반환
        """
        try:
            response = self.client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "num_predict": max_tokens,
                        "temperature": temperature,
                        "top_p": top_p,
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # llama-cpp-python 형식으로 변환
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": data.get("message", {}).get("content", "")
                    }
                }]
            }
        except httpx.ConnectError:
            logger.error("[OllamaClient] Ollama server not running! Start with: ollama serve")
            raise RuntimeError("Ollama 서버가 실행 중이 아닙니다. 'ollama serve' 명령으로 시작하세요.")
        except Exception as e:
            logger.error(f"[OllamaClient] API call failed: {str(e)}")
            raise


# 전역 클라이언트 인스턴스
_ollama_client: OllamaClient = None


def get_llm() -> OllamaClient:
    """Ollama 클라이언트 인스턴스 반환"""
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OllamaClient()
    return _ollama_client


def load_model():
    """모델 로드 (Ollama 연결 확인 + 워밍업)"""
    try:
        client = get_llm()
        # 간단한 연결 테스트
        response = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        response.raise_for_status()
        models = [m["name"] for m in response.json().get("models", [])]
        if OLLAMA_MODEL not in models and f"{OLLAMA_MODEL}:latest" not in models:
            logger.warning(f"[OllamaClient] Model {OLLAMA_MODEL} not found. Available: {models}")
        else:
            logger.info(f"[OllamaClient] Model {OLLAMA_MODEL} ready!")
        
        # 워밍업 쿼리 - 모델 메모리 로드
        logger.info(f"[OllamaClient] Warming up {OLLAMA_MODEL}...")
        client.create_chat_completion(
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=10,
            temperature=0.1
        )
        logger.info(f"[OllamaClient] Warmup complete!")
    except httpx.ConnectError:
        logger.error("[OllamaClient] Cannot connect to Ollama. Make sure it's running.")
        raise RuntimeError("Ollama 서버에 연결할 수 없습니다.")
