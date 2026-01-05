"""
Qwen3-1.7B GGUF 모델 로딩 및 생성 테스트 스크립트
"""
import os
import sys
import time

# 프로젝트 루트를 path에 추가 (app 패키지를 찾기 위함)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import numpy
    print(f"[*] Numpy version: {numpy.__version__}")
    if numpy.__version__.startswith("2."):
        print("[!] WARNING: Numpy 2.x detected. This may cause issues with llama-cpp-python wheels.")
    
    from app.utils.model_loader import get_llm
    
    print("[*] Loading model...")
    start_time = time.time()
    llm = get_llm()
    load_time = time.time() - start_time
    print(f"[OK] Model loaded in {load_time:.2f} seconds.")
    
    print("[*] Testing generation...")
    messages = [
        {"role": "system", "content": "당신은 친절한 AI 비서입니다. 반드시 한국어로 답변하세요."},
        {"role": "user", "content": "안녕하세요, 자기소개를 부탁드려요."}
    ]
    
    gen_start = time.time()
    response = llm.create_chat_completion(
        messages=messages,
        max_tokens=100,
        temperature=0.7
    )
    gen_time = time.time() - gen_start
    
    reply = response["choices"][0]["message"]["content"]
    print(f"\n[AI Response]\n{reply}")
    print(f"\n[OK] Generation complete in {gen_time:.2f} seconds.")

except Exception as e:
    print(f"\n[ERROR] Test failed: {str(e)}")
    import traceback
    traceback.print_exc()
