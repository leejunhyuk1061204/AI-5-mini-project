"""
회의록 요약 모듈 - Qwen3-1.7B-GGUF 모델 사용
구조화된 JSON 형식의 회의록 생성
"""
from fastapi import APIRouter
from pydantic import BaseModel
import json
import re
import logging
from typing import Dict, Any, List, Optional
from app.utils.model_loader import get_llm

# FastAPI 라우터 설정
router = APIRouter(prefix="/api", tags=["summarize"])


class SummarizeRequest(BaseModel):
    text: str


class SummarizeResponse(BaseModel):
    description: str
    core_summary: List[str]
    meeting_type: str
    topics: List[str]
    decisions: List[str]
    action_items: List[str]
    pending_items: List[str]
    parse_error: Optional[str] = None


# 전역 요약 모델 인스턴스
_summarizer: "MeetingSummarizer" = None


def load_summarizer():
    """요약 모델 로드"""
    global _summarizer
    if _summarizer is None:
        _summarizer = MeetingSummarizer()
    return _summarizer


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_text(request: SummarizeRequest):
    """
    회의 내용을 구조화된 JSON 형식으로 요약
    
    - **text**: 요약할 회의 텍스트
    """
    summarizer = load_summarizer()
    result = summarizer.summarize(request.text)
    return SummarizeResponse(**result)


class MeetingSummarizer:
    """GGUF 모델을 사용한 회의록 요약 클래스"""
    
    def __init__(self, model_name: str = "ggml-org/Qwen3-1.7B-GGUF"):
        """
        요약 모델 초기화
        """
        # 모델은 model_loader에서 관리함
        logger = logging.getLogger(__name__)
        logger.info("[MeetingSummarizer] Initialized with Qwen3-1.7B-GGUF (llama-cpp)")
        
    def summarize(self, text: str) -> Dict[str, Any]:
        """
        회의 내용을 구조화된 JSON 형식으로 요약
        """
        print(f"\n[AI] 요약 요청 수신 (텍스트 길이: {len(text)})")
        print(f"[AI] Ollama API 사용 (qwen3:1.7b)")
        print(f"[AI] 입력 텍스트 미리보기: {text[:200]}...")

        # 텍스트가 너무 짧거나 무의미한 경우 처리
        if not text or len(text.strip()) < 10:
             return {
                "description": "회의 내용이 너무 짧아 요약할 수 없습니다.",
                "core_summary": ["충분한 회의 데이터가 수집되지 않았습니다."],
                "meeting_type": "정보 부족",
                "topics": [],
                "decisions": [],
                "action_items": [],
                "pending_items": []
            }

        prompt = f"""당신은 회의록 요약 전문가입니다. 아래 회의 내용을 분석하여 **반드시** 지정된 JSON 형식으로만 답변하세요.

회의 내용 (STT 전사 결과):
{text}

### 카테고리 분류 가이드:
1. **decisions (결정 사항)**: 회의에서 최종 확정된 방침이나 선택. (예: "A안으로 확정", "B 기술 사용 결정")
2. **action_items (조치 필요 사항)**: 특정 인물이 수행해야 할 구체적인 과업. (예: "홍길동은 내일까지 보고서 제출", "디자인 수정 작업 착수") **'수정하기'처럼 너무 짧은 단어는 지양하고 구체적으로 쓰세요.**
3. **pending_items (보류 및 논의 필요)**: 결론이 나지 않았거나, 추적 관찰이 필요하거나, 나중에 다시 논의하기로 한 사항. (예: "예산 문제는 다음 주 재논의", "서버 도입은 잠정 보류")

### 지침:
1. **반드시 지정된 JSON 형식으로만 답변하세요.** 다른 설명이나 마크다운 백틱(```)을 붙이지 마세요.
2. **언어**: 한국어만 사용하세요. **한자(Chinese characters)는 절대 사용하지 마세요.**
3. **내용 충실성**: 반드시 제공된 회의 내용만을 바탕으로 요약하세요. **텍스트에 없는 단어(예: 테스트->투표)를 임의로 지어내거나 바꾸지 마세요.**
4. **구체성**: '수정하기', '보고하기' 등은 너무 모호합니다. '누가 무엇을 어떻게' 하는지에 대한 정보를 최대한 포함하여 구체적인 문장으로 작성하세요.
5. **간결성**: 'description'은 2문장 내외, 'core_summary'는 최대 3개의 핵심 포인트로 작성하세요.
6. **반복 금지**: 동일한 문장이나 단어를 반복해서 생성하지 마세요.

응답 형식 (JSON):
{{
    "description": "전체 요약",
    "core_summary": ["핵심1", "핵심2"],
    "meeting_type": "유형",
    "topics": ["키워드1", "키워드2"],
    "decisions": ["결정사항"],
    "action_items": ["조치사항"],
    "pending_items": ["보류사항"]
}}"""

        messages = [
            {"role": "user", "content": prompt}
        ]
        
        llm = get_llm()
        
        # llama-cpp-python의 create_chat_completion 사용
        response = llm.create_chat_completion(
            messages=messages,
            max_tokens=1024,
            temperature=0.3,
            top_p=0.9,
            repeat_penalty=1.2,
            stream=False
        )
        
        response_text = response["choices"][0]["message"]["content"]
        
        print(f"[AI] 모델 응답: {response_text[:100]}...")
        
        return self._parse_json_response(response_text)
    
    def _parse_json_response(self, response: str) -> Dict[str, Any]:
        """
        응답에서 JSON을 추출하고 파싱
        
        Args:
            response: 모델 응답 문자열
            
        Returns:
            파싱된 딕셔너리
        """
        result = None
        try:
            # JSON 블록 추출 시도
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                json_str = json_match.group()
                result = json.loads(json_str)
        except json.JSONDecodeError:
            pass
        
        # 파싱 실패 시 기본 구조 반환
        if result is None:
            return {
                "description": response.strip(),
                "core_summary": [],
                "meeting_type": "알 수 없음",
                "topics": [],
                "decisions": [],
                "action_items": [],
                "pending_items": [],
                "parse_error": "JSON 파싱 실패 - 원본 응답 반환"
            }
        
        # 데이터 타입 검증 및 보정
        return self._validate_and_normalize(result)
    
    def _validate_and_normalize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        LLM 응답 데이터의 타입을 검증하고 정규화
        """
        def ensure_string_list(value: Any) -> List[str]:
            """값을 문자열 리스트로 변환"""
            if not isinstance(value, list):
                return []
            result = []
            for item in value:
                if isinstance(item, str):
                    result.append(item)
                elif isinstance(item, dict):
                    # 딕셔너리인 경우 값들을 연결하거나 첫 번째 값 사용
                    if 'topic' in item:
                        result.append(str(item.get('topic', '')))
                    elif 'summary' in item:
                        result.append(str(item.get('summary', '')))
                    elif 'content' in item:
                        result.append(str(item.get('content', '')))
                    else:
                        # 첫 번째 문자열 값 사용
                        for v in item.values():
                            if isinstance(v, str):
                                result.append(v)
                                break
                else:
                    result.append(str(item))
            return result
        
        return {
            "description": str(data.get("description", "")).strip() or "회의 내용 요약",
            "core_summary": ensure_string_list(data.get("core_summary", [])),
            "meeting_type": str(data.get("meeting_type", "알 수 없음")).strip() or "알 수 없음",
            "topics": ensure_string_list(data.get("topics", [])),
            "decisions": ensure_string_list(data.get("decisions", [])),
            "action_items": ensure_string_list(data.get("action_items", [])),
            "pending_items": ensure_string_list(data.get("pending_items", [])),
            "parse_error": None
        }


def summarize_meeting(text: str) -> Dict[str, Any]:
    """
    회의 내용을 구조화된 형식으로 요약하는 편의 함수
    
    Args:
        text: 요약할 회의 텍스트
        
    Returns:
        구조화된 회의록 딕셔너리
    """
    summarizer = MeetingSummarizer()
    return summarizer.summarize(text)


if __name__ == "__main__":
    # 테스트: audio_test_transcription.txt 파일 내용으로 요약 테스트
    import os
    
    # 테스트 파일 경로
    test_file_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "audio_test_transcription.txt"
    )
    
    print(f"테스트 파일 경로: {test_file_path}")
    
    # 파일 읽기
    with open(test_file_path, "r", encoding="utf-8") as f:
        test_text = f.read().strip()
    
    print(f"\n원본 텍스트:\n{test_text}")
    print("\n" + "="*50)
    
    # 요약 실행
    print("\nQwen3-1.7B-GGUF 모델 로딩 중...")
    summarizer = MeetingSummarizer()
    
    print("회의록 요약 생성 중...")
    result = summarizer.summarize(test_text)
    
    print("\n--- 생성된 회의록 결과 ---")
    print(json.dumps(result, ensure_ascii=False, indent=4))
