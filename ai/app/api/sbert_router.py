"""
KR-SBERT 임베딩 API - snunlp/KR-SBERT-V2-Freezing 모델 사용
한국어 문장 임베딩 생성
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

# FastAPI 라우터 설정
router = APIRouter(prefix="/api", tags=["embedding"])


class EmbeddingRequest(BaseModel):
    text: str


class EmbeddingBatchRequest(BaseModel):
    texts: List[str]


class EmbeddingResponse(BaseModel):
    embedding: List[float]


class EmbeddingBatchResponse(BaseModel):
    embeddings: List[List[float]]


class SimilarityRequest(BaseModel):
    text1: str
    text2: str


class SimilarityResponse(BaseModel):
    similarity: float


# 전역 모델 인스턴스
_model: SentenceTransformer = None


def load_sbert_model():
    global _model  # global 키워드 필수!
    if _model is None:
        model_name = "jhgan/ko-sroberta-multitask"
        print(f" {model_name} 모델 로드 중...", flush=True)
        _model = SentenceTransformer(model_name)
        print(f" {model_name} 모델 로드 완료! (device: {_model.device})", flush=True)
    return _model


@router.post("/embedding", response_model=EmbeddingResponse)
async def get_embedding(request: EmbeddingRequest):
    """
    단일 텍스트의 임베딩 벡터 생성
    
    - **text**: 임베딩할 텍스트
    """
    try:
        model = load_sbert_model()
        embedding = model.encode(request.text)
        return EmbeddingResponse(embedding=embedding.tolist())
    except Exception as e:
        import traceback
        print("!!! EMBEDDING ERROR !!!")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embeddings", response_model=EmbeddingBatchResponse)
async def get_embeddings(request: EmbeddingBatchRequest):
    """
    여러 텍스트의 임베딩 벡터 일괄 생성
    
    - **texts**: 임베딩할 텍스트 리스트
    """
    model = load_sbert_model()
    embeddings = model.encode(request.texts)
    return EmbeddingBatchResponse(embeddings=[emb.tolist() for emb in embeddings])


@router.post("/similarity", response_model=SimilarityResponse)
async def get_similarity(request: SimilarityRequest):
    """
    두 텍스트 간의 코사인 유사도 계산
    
    - **text1**: 첫 번째 텍스트
    - **text2**: 두 번째 텍스트
    """
    model = load_sbert_model()
    embeddings = model.encode([request.text1, request.text2])
    
    # 코사인 유사도 계산
    similarity = np.dot(embeddings[0], embeddings[1]) / (
        np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
    )
    
    return SimilarityResponse(similarity=float(similarity))
