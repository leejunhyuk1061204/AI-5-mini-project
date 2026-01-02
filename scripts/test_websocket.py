import asyncio
import websockets
import os

async def test_audio_upload():
    uri = "ws://localhost:8080/ws/audio"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            # 1. 10KB 더미 데이터 생성
            dummy_audio_data = os.urandom(1024 * 10) 
            
            # 2. 데이터 전송 (5번 반복)
            for i in range(5):
                print(f"Sending chunk {i+1}...")
                await websocket.send(dummy_audio_data)
                await asyncio.sleep(0.1)
            
            print("Upload complete. Closing connection.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # uv or pip requirement: websockets
    # pip install websockets
    asyncio.run(test_audio_upload())
