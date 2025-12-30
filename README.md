# AI-5-mini-project

# fontend
npm install

# backend
# 1. backend 폴더로 이동
cd backend

# 2. conda 환경 생성 (최초 1회)
conda create -n ai5-backend python=3.12

# 3. conda 환경 활성화
conda activate ai5-backend

# 4. 패키지 설치
pip install -r requirements.txt

# 5. 서버 실행
# 포트 충돌 시 8001 사용
uvicorn app.main:app --port 8001

# 6. API 테스트
http://localhost:8001/docs

