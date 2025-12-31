# AI-5-mini-project

# ai
# 1. ai 폴더로 이동
cd ai

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




### ### ### ### ### ### ### ###




## Frontend

### 전제 조건 (Prerequisites)
프로젝트를 실행하기 전에 Node.js가 설치되어 있는지 확인해주세요.
팀원 분들은 터미널에서 다음 명령어를 입력하여 버전을 확인해야 합니다.

```bash
# Node.js 버전 확인 (v18 이상 권장)
node -v

# npm 버전 확인
npm -v
```

*Node.js가 설치되어 있지 않다면 아래 방법을 통해 설치해주세요.*

#### Node.js 설치 방법
```bash
# nvm 설치 (curl)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# nvm 설치 후 터미널 재시작, node lts 버전 설치
nvm install --lts
nvm use --lts
```

1. **frontend 디렉토리로 이동**
   ```bash
   cd frontend
   ```

2. **패키지 설치 (Install Dependencies)**
   ```bash
   npm install
   ```

3. **개발 서버 실행 (Run Dev Server)**
   ```bash
   npm run dev
   ```