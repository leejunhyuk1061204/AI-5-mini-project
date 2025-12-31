import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.embedding_service import embedding_service

def test_embedding_logic():
    # 현재 스크립트 위치 기준 test_input.txt 경로 설정
    test_file = os.path.join(os.path.dirname(__file__), "test_input.txt")
    
    if not os.path.exists(test_file):
        print(f"오류: 테스트 파일이 없습니다 -> {test_file}")
        return

    print(f"--- 🧪 Embedding Test (Existing File: {os.path.basename(test_file)}) Start ---")
    
    # process_file test (파일 읽기 -> 청크 분할 -> 임베딩 생성)
    embedding_data = embedding_service.process_file(test_file, chunk_size=30)
    
    if embedding_data:
        print(f"Total chunks from file: {len(embedding_data)}")
        for i, item in enumerate(embedding_data):
            print(f"Chunk {i+1}: {item['chunk']}")
            print(f"Vector dimension: {len(item['vector'])}")
    else:
        print("Error: No embedding data generated from file.")
        
    print("--- 🧪 Embedding Test End ---")

if __name__ == "__main__":
    test_embedding_logic()
