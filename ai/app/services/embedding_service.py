from sentence_transformers import SentenceTransformer
from typing import List

class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        로컬 임베딩 모델 로드 (all-MiniLM-L6-v2)
        """
        print(f"Loading embedding model: {model_name}...")
        self.model = SentenceTransformer(model_name)
        print("Model loaded successfully.")

    def get_embeddings(self, text_list: List[str]) -> List[List[float]]:
        """
        텍스트 리스트를 입력받아 벡터 리스트 반환
        """
        if not text_list:
            return []
        embeddings = self.model.encode(text_list)
        return embeddings.tolist()

    def chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        """
        긴 텍스트를 적절한 글자 수 단위로 분할 (단순 분할 예시)
        """
        if not text:
            return []
        
        # 공백 기준 분할 후 chunk_size를 넘지 않게 결합하는 방식 (간단한 구현)
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

    def read_text_file(self, file_path: str) -> str:
        """
        텍스트 파일을 읽어서 문자열로 반환
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"파일 읽기 오류: {e}")
            return ""

    def process_file(self, file_path: str, chunk_size: int = 500) -> List[dict]:
        """
        파일을 읽고, 청크로 나누고, 임베딩을 생성하여 반환
        """
        text = self.read_text_file(file_path)
        if not text:
            return []
            
        chunks = self.chunk_text(text, chunk_size)
        vectors = self.get_embeddings(chunks)
        
        return [
            {"chunk": chunk, "vector": vector}
            for chunk, vector in zip(chunks, vectors)
        ]

# 싱글톤 패턴 또는 전역 인스턴스로 사용 가능
embedding_service = EmbeddingService()
