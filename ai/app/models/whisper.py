"""
faster-whisper를 사용한 음성 → 텍스트 변환 프로그램

사용법:
    python whisper.py <음성파일 경로>
    
지원 형식: mp3, wav, m4a, mp4, flac, ogg 등
"""

import sys
from pathlib import Path
from faster_whisper import WhisperModel


def transcribe_audio(audio_path: str, model_size: str = "small") -> str:
    """
    음성 파일을 텍스트로 변환합니다.
    
    Args:
        audio_path: 음성 파일 경로
        model_size: Whisper 모델 크기 (tiny, base, small, medium, large)
    
    Returns:
        변환된 텍스트
    """
    # 파일 존재 확인
    if not Path(audio_path).exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {audio_path}")
    
    # 모델 로드 (첫 실행 시 자동 다운로드)
    print(f"모델 로딩 중... (model: {model_size})")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    
    # 음성 변환
    print(f"음성 변환 중: {audio_path}")
    segments, info = model.transcribe(audio_path, language="ko")
    
    print(f"감지된 언어: {info.language} (확률: {info.language_probability:.2%})")
    print(f"오디오 길이: {info.duration:.2f}초")
    print("-" * 50)
    
    # 결과 텍스트 수집
    full_text = []
    for segment in segments:
        print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
        full_text.append(segment.text)
    
    return " ".join(full_text)


def main():
    if len(sys.argv) < 2:
        print("사용법: python whisper.py <음성파일 경로>")
        print("예시: python whisper.py audio.mp3")
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    try:
        result = transcribe_audio(audio_path)
        print("\n" + "=" * 50)
        print("전체 변환 결과:")
        print("=" * 50)
        print(result)
        
        # 결과를 텍스트 파일로 저장
        output_path = Path(audio_path).stem + "_transcription.txt"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(result)
        print(f"\n결과가 '{output_path}'에 저장되었습니다.")
        
    except FileNotFoundError as e:
        print(f"오류: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"변환 중 오류 발생: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
