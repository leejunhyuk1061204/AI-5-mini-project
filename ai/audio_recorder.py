import sounddevice as sd
import numpy as np
import scipy.io.wavfile as wav
import argparse
import time
import sys
from pathlib import Path

def list_devices():
    """사용 가능한 오디오 입력 장치 목록을 출력합니다."""
    print("\n--- 사용 가능한 오디오 입력 장치 ---")
    print(sd.query_devices())
    print("----------------------------------\n")

def record_audio(output_path, duration=None, sample_rate=44100, device=None):
    """
    실시간으로 오디오를 녹음하고 WAV 파일로 저장합니다.
    
    Args:
        output_path: 저장할 파일 경로
        duration: 녹음 시간(초). None일 경우 사용자가 Ctrl+C를 누를 때까지 녹음합니다.
        sample_rate: 샘플링 레이트 (기본값 44100Hz)
        device: 입력 장치 ID 또는 이름
    """
    print(f"녹음 시작: {output_path}")
    print(f"샘플링 레이트: {sample_rate}Hz")
    if device is not None:
        print(f"사용 장치: {device}")
    
    recording = []
    
    def callback(indata, frames, time, status):
        if status:
            print(status, file=sys.stderr)
        recording.append(indata.copy())

    try:
        with sd.InputStream(samplerate=sample_rate, device=device, channels=1, callback=callback):
            if duration:
                print(f"{duration}초 동안 녹음합니다...")
                time.sleep(duration)
            else:
                print("녹음 중... (중지하려면 Ctrl+C를 누르세요)")
                while True:
                    time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n녹음이 사용자에 의해 중지되었습니다.")
    except Exception as e:
        print(f"녹음 중 오류 발생: {e}")
        return

    # 녹음된 데이터를 하나의 배열로 합침
    if not recording:
        print("녹음된 데이터가 없습니다.")
        return

    audio_data = np.concatenate(recording, axis=0)
    
    # WAV 파일로 저장
    wav.write(output_path, sample_rate, audio_data)
    print(f"녹음 완료! 파일이 저장되었습니다: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="실시간 오디오 녹음기")
    parser.add_argument("-o", "--output", type=str, default="recorded_audio.wav", help="출력 파일 경로")
    parser.add_argument("-d", "--duration", type=int, help="녹음 시간 (초)")
    
    parser.add_argument("-s", "--sample-rate", type=int, default=44100, help="샘플링 레이트 (기본: 44100)")
    parser.add_argument("-l", "--list-devices", action="store_true", help="사용 가능한 오디오 장치 목록 출력")
    parser.add_argument("--device", type=int, help="입력 장치 ID")

    args = parser.parse_args()

    if args.list_devices:
        list_devices()
        sys.exit(0)

    record_audio(args.output, args.duration, args.sample_rate, args.device)
