from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import List, Optional
import os

# FastAPI 라우터 설정
router = APIRouter(prefix="/api/v2", tags=["embedding-v2"])

class EmbeddingRequest(BaseModel):
    text: str

class EmbeddingBatchRequest(BaseModel):
    texts: List[str]

class FileProcessRequest(BaseModel):
    file_path: str
    chunk_size: Optional[int] = 500

class ChunkRequest(BaseModel):
    text: str
    chunk_size: Optional[int] = 500

# 전역 모델 인스턴스
_model: SentenceTransformer = None

def load_model():
    """로컬 임베딩 모델 로드 (all-MiniLM-L6-v2)"""
    global _model
    if _model is None:
        model_name = "all-MiniLM-L6-v2"
        print(f"[Embedding] Loading model: {model_name}...", flush=True)
        _model = SentenceTransformer(model_name)
        print("[Embedding] Model loaded!", flush=True)
    return _model

def chunk_text(text: str, chunk_size: int = 500) -> List[str]:
    """긴 텍스트를 적절한 글자 수 단위로 분할"""
    if not text:
        return []
    
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0
    
    for word in words:
        if current_length + len(word) + 1 > chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_length = len(word)
        else:
            current_chunk.append(word)
            current_length += len(word) + 1
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    return chunks

@router.post("/embedding")
async def get_embedding(request: EmbeddingRequest):
    """단일 텍스트의 임베딩 벡터 생성"""
    model = load_model()
    embedding = model.encode(request.text)
    return {"embedding": embedding.tolist()}

@router.post("/embeddings")
async def get_embeddings(request: EmbeddingBatchRequest):
    """여러 텍스트의 임베딩 벡터 일괄 생성"""
    model = load_model()
    embeddings = model.encode(request.texts)
    return {"embeddings": embeddings.tolist()}

@router.post("/chunk")
async def get_chunks(request: ChunkRequest):
    """텍스트 분할(Chunking) 테스트용 엔드포인트"""
    chunks = chunk_text(request.text, request.chunk_size)
    return {"chunks": chunks}

@router.post("/process_file")
async def process_file(request: FileProcessRequest):
    """파일을 읽고, 청크로 나누고, 임베딩을 생성하여 반환"""
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    try:
        with open(request.file_path, 'r', encoding='utf-8') as f:
            text = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 읽기 오류: {str(e)}")

    if not text:
        return {"results": []}
        
    chunks = chunk_text(text, request.chunk_size)
    model = load_model()
    vectors = model.encode(chunks)
    
    results = [
        {"chunk": chunk, "vector": vector.tolist()}
        for chunk, vector in zip(chunks, vectors)
    ]
    
    return {"results": results}
