from faster_whisper import WhisperModel
import os

class WhisperService:
    def __init__(self, model_size="small", device="auto", compute_type="float16"):
        """
        Initializes the Whisper model.
        
        Args:
            model_size (str): The size of the model to load (e.g., "small", "medium", "large").
            device (str): Device to use for computation ("cpu", "cuda", "auto").
            compute_type (str): Type of quantization to use ("float16", "int8_float16", "int8").
        """
        # Ensure the model cache directory exists if custom path logic is needed, 
        # but faster-whisper handles this by default.
        print(f"Loading Whisper model: {model_size} on {device} with {compute_type}...")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print("Whisper model loaded successfully.")

    def transcribe(self, audio_path: str):
        """
        Transcribes the given audio file.

        Args:
            audio_path (str): Path to the audio file.

        Returns:
            list: A list of segments containing text and timestamps.
            info: Information about the transcription.
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        segments, info = self.model.transcribe(audio_path)
        
        # Convert generator to list to iterate immediately if needed, 
        # or return generator. Creating a list for easier usage upstream.
        # But for large files, generator is better. The user example iterates.
        # We will yield or return the generator directly to match user expectations usually,
        # but let's return the generator as per faster-whisper default, but wrapped slightly if needed.
        
        return segments, info

if __name__ == "__main__":
    # Simple test execution
    # Note: Requires an 'audio.mp3' file in the current directory to run this directly without args
    try:
        service = WhisperService()
        print("Service initialized.")
    except Exception as e:
        print(f"Failed to initialize service: {e}")
