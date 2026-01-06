# AI-5-mini-project

# ai
# 1. ai 폴더 이동
cd ai

# 2. 가상환경 생성 (Python 3.12 기준)
conda create -n ai5-backend python=3.12
conda activate ai5-backend

# 3. 필수 PyTorch 설치 (CUDA 12.4용 - 매우 중요!)
# 모델의 GPU 가속을 위해 일반 pip install이 아닌 아래 명령어를 권장합니다.
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

# 4. 나머지 패키지 설치
pip install -r requirements.txt

# 5. Ollama 모델 다운로드 (서버 내에서 호출하는 모델들)
ollama pull qwen3:0.6b   # 요약 전용 경량 모델
ollama pull qwen3:1.7b   # 챗봇 전용 모델

# 6. 백엔드 및 전체 실행 방법
# 루트 폴더에서
npm install     # concurrently 등 유틸리티 설치
npm run dev     # AI, Backend, Frontend 동시 실행


# 시스템 요구 사양: 현재 설정이 **조합 B(Medium 모델)**이므로, 원활한 동작을 위해 GPU VRAM 6GB 이상, RAM 16GB 이상을 요구 사양으로 명시하는 것이 좋습니다.

# Troubleshooting: "CUDA 버전이 맞지 않을 경우 compute_type="int8"에서 오류가 발생할 수 있으니 nvidia-smi를 통해 CUDA 12.x 버전을 확인하라"는 내용을 추가하면 완벽합니다.


# 7. API 테스트
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