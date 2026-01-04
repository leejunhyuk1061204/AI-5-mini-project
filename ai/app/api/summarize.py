"""
회의록 요약 모듈 - Qwen2.5-0.5B-Instruct 모델 사용
구조화된 JSON 형식의 회의록 생성
"""
from fastapi import APIRouter
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import json
import re
from typing import Dict, Any, List, Optional

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
    """Qwen2.5-0.5B-Instruct 모델을 사용한 회의록 요약 클래스"""
    
    def __init__(self, model_name: str = "Qwen/Qwen2.5-0.5B-Instruct"):
        """
        요약 모델 초기화
        
        Args:
            model_name: HuggingFace 모델 이름
        """
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            device_map="auto" if self.device == "cuda" else None
        )
        if self.device == "cpu":
            self.model = self.model.to(self.device)
        
    def summarize(self, text: str) -> Dict[str, Any]:
        """
        회의 내용을 구조화된 JSON 형식으로 요약
        """
        print(f"\n[AI] 요약 요청 수신 (텍스트 길이: {len(text)})")
        print(f"[AI] GPU(CUDA) 사용 여부: {self.device == 'cuda'}")
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

### 지침:
1. **내용 충실성**: 반드시 제공된 회의 내용만을 바탕으로 요약하세요. 모르는 내용을 지어내지 마세요 (환각 방지).
2. **STT 오류 교정**: '박백업'->'백엔드', '스탱'->'스택' 등 기술 용어의 음성 인식 오류를 문맥에 맞게 수정하여 요약하세요.
3. **간결성**: 'description'은 2문장 내외, 'core_summary'는 최대 3개의 핵심 포인트로 작성하세요.

### 예시 (Few-shot):
입력: "이번 프로젝트 기술 스탱 정리합시다. 백앤드는 자바 스프링 버튼 사용하고 파이스와 페스트 API 구축했습니다."
출력: {{
    "description": "프로젝트 핵심 기술 스택으로 Java Spring Boot와 Python FastAPI 구축을 확정했습니다.",
    "core_summary": ["Java Spring Boot 기반 백엔드 구성", "Python FastAPI를 이용한 API 서버 구축"],
    "meeting_type": "기술 협의",
    "topics": ["기술 스택", "백엔드", "API"],
    "decisions": ["Spring Boot 및 FastAPI 사용"],
    "action_items": [],
    "pending_items": []
}}

응답 형식 (JSON):
{{
    "description": "전체 요약",
    "core_summary": ["핵심1", "핵심2"],
    "meeting_type": "유형",
    "topics": ["키워드1", "키워드2"],
    "decisions": ["결정사항"],
    "action_items": ["할일"],
    "pending_items": ["보류"]
}}"""

        messages = [
            {"role": "user", "content": prompt}
        ]
        
        input_text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        inputs = self.tokenizer(input_text, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=512, # 요약용으로 충분히 작게 유지
                temperature=0.1,    # 환각 방지를 위해 매우 낮게 설정
                top_p=0.9,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
        
        response = self.tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:], 
            skip_special_tokens=True
        )
        
        print(f"[AI] 모델 응답: {response[:100]}...")
        
        return self._parse_json_response(response)
    
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
    print("\nQwen2.5-0.5B-Instruct 모델 로딩 중...")
    summarizer = MeetingSummarizer()
    
    print("회의록 요약 생성 중...")
    result = summarizer.summarize(test_text)
    
    print("\n--- 생성된 회의록 결과 ---")
    print(json.dumps(result, ensure_ascii=False, indent=4))
