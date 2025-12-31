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
        
        Args:
            text: 요약할 회의 텍스트
            
        Returns:
            구조화된 회의록 딕셔너리
        """
        prompt = f"""당신은 회의록 요약 전문가입니다. 아래 회의 내용을 분석하여 정확히 다음 JSON 형식으로 요약해주세요.

회의 내용:
{text}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이 JSON만):
{{
    "description": "회의의 전체적인 요약 설명 (2-3문장)",
    "core_summary": [
        "핵심 요약 포인트 1",
        "핵심 요약 포인트 2",
        "핵심 요약 포인트 3",
        "핵심 요약 포인트 4"
    ],
    "meeting_type": "회의 유형 (예: 프로젝트 조정 회의, 브레인스토밍, 정기 회의 등)",
    "topics": [
        "논의된 주제 1",
        "논의된 주제 2",
        "논의된 주제 3"
    ],
    "decisions": [
        "결정 사항 1",
        "결정 사항 2"
    ],
    "action_items": [
        "할 일 항목 1 (담당자, 기한)",
        "할 일 항목 2 (담당자, 기한)"
    ],
    "pending_items": [
        "후속 논의 필요 사항 1",
        "후속 논의 필요 사항 2"
    ]
}}"""

        messages = [
            {"role": "user", "content": prompt}
        ]
        
        # 토크나이즈
        input_text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        inputs = self.tokenizer(input_text, return_tensors="pt").to(self.device)
        
        # 생성
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=1024,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
        
        # 디코딩
        response = self.tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:], 
            skip_special_tokens=True
        )
        
        # JSON 파싱
        return self._parse_json_response(response)
    
    def _parse_json_response(self, response: str) -> Dict[str, Any]:
        """
        응답에서 JSON을 추출하고 파싱
        
        Args:
            response: 모델 응답 문자열
            
        Returns:
            파싱된 딕셔너리
        """
        try:
            # JSON 블록 추출 시도
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass
        
        # 파싱 실패 시 기본 구조 반환
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
