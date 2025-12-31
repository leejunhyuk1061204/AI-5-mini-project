import sys
import os

# Add ai to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app')))

from models.whisper_service import WhisperService

def test_initialization():
    print("Testing WhisperService initialization...")
    try:
        service = WhisperService(model_size="small", device="cpu", compute_type="int8") # Use CPU/int8 for quick test if no GPU
        print("WhisperService initialized successfully.")
    except Exception as e:
        print(f"FAILED to initialize WhisperService: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_initialization()
