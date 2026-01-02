import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../sidebar/Sidebar';
import type { HistoryItem } from '../types';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: (event: Event) => void;
    onend: (event: Event) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: Event) => void;
}

// Window augmentation
declare global {
    interface Window {
        SpeechRecognition: {
            new(): SpeechRecognition;
        };
        webkitSpeechRecognition: {
            new(): SpeechRecognition;
        };
    }
}

const LiveSttPage: React.FC = () => {
    // Load temp data
    const loadTempData = () => {
        try {
            const saved = localStorage.getItem('live_stt_temp');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed;
            }
        } catch (e) {
            console.error('Failed to load temp data', e);
        }
        return null;
    };

    const tempData = loadTempData();

    const [isListening, setIsListening] = useState(false);
    const [transcripts, setTranscripts] = useState<string[]>(tempData?.transcripts || []);
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // MediaRecorder for audio recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // WebSocket for real-time audio streaming
    const wsRef = useRef<WebSocket | null>(null);
    const JAVA_WS_URL = import.meta.env.VITE_JAVA_WS_URL || 'ws://localhost:8080';

    // meetingId를 URL 파라미터에서 읽음 (예: /live?meetingId=1)
    const meetingIdParam = new URLSearchParams(window.location.search).get('meetingId');
    const MEETING_ID = meetingIdParam ? Number(meetingIdParam) : NaN;

    // History State
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        try {
            const saved = localStorage.getItem('live_stt_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load history', e);
            return [];
        }
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [summary, setSummary] = useState<string | null>(tempData?.summary || null);
    const [isSummarizing, setIsSummarizing] = useState(false);

    // Auto-save temp data
    useEffect(() => {
        const dataToSave = {
            transcripts,
            summary
        };
        localStorage.setItem('live_stt_temp', JSON.stringify(dataToSave));
    }, [transcripts, summary]);

    // Save history to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('live_stt_history', JSON.stringify(history));
    }, [history]);

    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
    const handleSelectHistory = useCallback((id: string) => {
        setSelectedHistoryId(id);
        // In a real app, this might navigate or show history in a modal
    }, []);

    const isListeningIntent = useRef(false);

    useEffect(() => {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'ko-KR';

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                // If user intended to keep listening, restart it
                if (isListeningIntent.current) {
                    try {
                        recognition.start();
                    } catch (e) {
                        // Ignore errors if already started
                        console.log("Restarting recognition...");
                    }
                } else {
                    setIsListening(false);
                }
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let final = '';
                let interim = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }

                if (final) {
                    setTranscripts(prev => [...prev, final]);
                }
                setInterimTranscript(interim);

                // Auto scroll to bottom
                if (bottomRef.current) {
                    bottomRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error", event);
                // On error, if valid intent, it will naturally go to onend and restart. 
                // But sometimes error prevents restart immediately, so careful logic needed.
                // For now, let it hit onend.
            };

            recognitionRef.current = recognition;
        } else {
            alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Safari를 사용해주세요.');
        }

        return () => {
            isListeningIntent.current = false; // Stop intent on unmount
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            // Cleanup MediaRecorder
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Send audio to Java backend
    const sendAudioToBackend = async (audioBlob: Blob, transcriptText: string) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, `recording_${Date.now()}.webm`);
            formData.append('transcript', transcriptText);
            formData.append('timestamp', new Date().toISOString());
            formData.append('meetingId', String(MEETING_ID));

            // TODO: Java 백엔드 URL로 변경하세요
            const response = await fetch('http://localhost:8080/api/recordings', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                console.log('녹음 파일이 서버에 저장되었습니다.');
            } else {
                console.error('서버 저장 실패:', response.statusText);
            }
        } catch (error) {
            console.error('녹음 파일 전송 중 오류:', error);
        } finally {
            setIsUploading(false);
        }
    };

    // Connect WebSocket for audio streaming
    const connectWebSocket = () => {
        return new Promise<WebSocket>((resolve, reject) => {
            const wsUrl = `${JAVA_WS_URL}/ws/audio?meetingId=${MEETING_ID}`;
            console.log("WS 연결 시도:", wsUrl, "MEETING_ID:", MEETING_ID);

            const ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';

            ws.onopen = () => {
                console.log('WebSocket 연결됨');
                wsRef.current = ws;
                resolve(ws);
            };

            ws.onclose = (e) => {
                console.log('WebSocket 종료됨', (e as CloseEvent).code, (e as CloseEvent).reason, "url=", ws.url);
            };


            ws.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                reject(error);
            };
        });
    };

    // Disconnect WebSocket
    const disconnectWebSocket = () => {
        if (wsRef.current) {
            console.log('🔌 [Frontend] WebSocket 연결 해제 중...');
            wsRef.current.close();
            wsRef.current = null;
        }
    };

    // Chunk counter for logging
    const chunkCounterRef = useRef<number>(0);

    // Start MediaRecorder
    const startMediaRecorder = async () => {
        try {
            if (!Number.isFinite(MEETING_ID)) {
                alert("meetingId가 없습니다. /live?meetingId=1 형태로 접속해주세요.");
                return;
            }


        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        await connectWebSocket();

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });

        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);

                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(event.data);
                    console.log(`오디오 청크 전송: ${event.data.size} bytes`);
                } else {
                    console.warn("WS 아직 OPEN 아님. 청크 전송 스킵");
                }
            }
        };


        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const fullText = transcripts.join(' ');
            sendAudioToBackend(audioBlob, fullText);

            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
        };

        mediaRecorder.start(1000);
        mediaRecorderRef.current = mediaRecorder;
        console.log('MediaRecorder 시작됨 (1초 청크)');
    } catch (error) {
        console.error('마이크 접근 오류:', error);
        alert('마이크 접근 권한을 허용해주세요.');
    }
};


    // Stop MediaRecorder
    const stopMediaRecorder = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
            console.log('MediaRecorder 정지됨');
        }
        // Disconnect WebSocket
        disconnectWebSocket();
    };

    const toggleListening = async () => {
        if (isListening) {
            isListeningIntent.current = false; // User explicit stop
            recognitionRef.current?.stop();
            stopMediaRecorder();
        } else {
            isListeningIntent.current = true; // User explicit start
            try {
                recognitionRef.current?.start();
                await startMediaRecorder();
            } catch (e) {
                console.error("Failed to start", e);
                isListeningIntent.current = false; // Revert if failed
            }
        }
    };

    // Clear transcript
    const handleClear = () => {
        if (window.confirm('정말로 기록을 삭제하시겠습니까? 임시 저장된 내용도 삭제됩니다.')) {
            setTranscripts([]);
            setInterimTranscript('');
            setSummary(null);
        }
    }

    const handleSave = () => {
        const fullText = transcripts.join(' ');
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            title: `실시간 회의록 ${new Date().toLocaleString()}`,
            date: new Date().toISOString(),
            type: 'live',
            data: {
                description: fullText,
                core_summary: summary ? [summary] : ['실시간 기록된 내용입니다.'],
                meeting_type: 'Live Meeting',
                topics: [],
                decisions: [],
                action_items: [],
                pending_items: []
            }
        };

        setHistory(prev => [newItem, ...prev]);
        setSelectedHistoryId(newItem.id);
        alert('회의록이 저장되었습니다.');
    };

    const handleSummarize = () => {
        setIsSummarizing(true);

        // Mock API call delay
        setTimeout(() => {
            const mockSummary = "이번 회의에서는 주요 프로젝트 일정에 대한 논의가 있었습니다. 팀원들은 각자의 진행 상황을 공유했고, 다음 주까지 프로토타입을 완성하기로 합의했습니다. 또한, 디자인 시안에 대한 피드백을 수집하여 수요일까지 수정안을 제출하기로 결정했습니다.";
            setSummary(mockSummary);
            setIsSummarizing(false);
        }, 2000);
    };

    const handleDeleteHistory = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (selectedHistoryId === id) {
            setSelectedHistoryId(null);
        }
    };

    return (
        <div className="relative flex h-full w-full flex-row overflow-hidden bg-[#f6f6f8] font-['Inter',sans-serif] text-[#0d121b] antialiased">
            {/* Reuse Sidebar for consistency */}
            <Sidebar
                history={history}
                onSelectHistory={handleSelectHistory}
                onDelete={handleDeleteHistory}
                currentHistoryId={selectedHistoryId}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
                <div className="flex-1 flex flex-col max-w-[960px] mx-auto w-full p-4 md:p-8 pt-2 md:pt-8 min-h-0 overflow-hidden">

                    {/* Header */}
                    <div className="flex flex-col items-start gap-4 mb-4 md:flex-row md:justify-between md:items-center">
                        <div className="flex items-center gap-4">
                            {/* Mobile Sidebar Toggle */}
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 -ml-2 rounded-lg hover:bg-[#e7ebf0] text-[#444746] transition-colors"
                                title="사이드바 열기"
                            >
                                <span className="material-symbols-outlined text-[24px]">menu</span>
                            </button>

                            <div>
                                <h1 className="text-[#0d121b] text-2xl md:text-3xl font-black tracking-tight mb-1 md:mb-2">실시간 회의록</h1>
                                <p className="text-[#4c669a] text-xs md:text-sm">마이크를 켜고 회의를 시작하세요. AI가 실시간으로 기록합니다.</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                            <button
                                onClick={handleSummarize}
                                disabled={isSummarizing || isListening}
                                className={`px-3 py-2 md:px-4 text-sm font-bold text-white rounded-lg transition-all shadow-sm flex items-center gap-2 whitespace-nowrap shrink-0
                                    ${isSummarizing || isListening
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                                    }`}
                            >
                                {isSummarizing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>요약 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                        <span>AI 요약하기</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-3 py-2 md:px-4 text-sm font-bold text-white bg-[#135bec] hover:bg-blue-700 rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0"
                            >
                                저장하기
                            </button>
                            <button
                                onClick={handleClear}
                                className="px-3 py-2 md:px-4 text-sm font-semibold text-[#4c669a] hover:bg-[#e7ebf3] rounded-lg transition-colors border border-transparent hover:border-[#cfd7e7] whitespace-nowrap shrink-0"
                            >
                                지우기
                            </button>
                        </div>
                    </div>

                    {/* Transcript Area */}
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#cfd7e7] p-8 overflow-y-auto min-h-0">
                        {transcripts.length === 0 && !interimTranscript && (
                            <div className="h-full flex flex-col items-center justify-center text-[#9aa6c2] gap-4 opacity-70">
                                <span className="material-symbols-outlined text-[64px]">mic</span>
                                <p className="text-lg">하단의 마이크 버튼을 눌러 대화를 시작하세요</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {transcripts.map((text, index) => (
                                <p key={index} className="text-lg leading-relaxed text-[#0d121b] animate-fade-in">
                                    {text}
                                </p>
                            ))}
                            {interimTranscript && (
                                <p className="text-lg leading-relaxed text-[#135bec] font-medium animate-pulse">
                                    {interimTranscript}
                                </p>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* AI Summary Section - Conditionally rendered within scroll view */}
                        {(summary || isSummarizing) && (
                            <div className="mt-8 pt-8 border-t border-[#e7ebf3] animate-fade-in text-left">
                                <div className="flex items-center gap-2 mb-4 text-[#135bec]">
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                    <h3 className="font-bold text-lg">AI 요약</h3>
                                </div>
                                <div className="bg-[#f8faff] rounded-xl p-6 border border-[#e7ebf3]">
                                    <p className="text-[#0d121b] leading-relaxed">
                                        {summary || (
                                            <span className="flex items-center gap-2 text-[#4c669a]">
                                                <span className="w-4 h-4 border-2 border-[#4c669a]/30 border-t-[#4c669a] rounded-full animate-spin"></span>
                                                AI가 회의 내용을 요약하고 있습니다...
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mic Button Area - Static Position below Transcript */}
                    <div className="flex flex-col items-center gap-4 pt-6 pb-2 shrink-0">
                        {isListening && (
                            <div className="flex items-center gap-2 bg-[#135bec]/10 text-[#135bec] px-4 py-2 rounded-full backdrop-blur-sm border border-[#135bec]/20 animate-pulse">
                                <div className="w-2 h-2 rounded-full bg-[#135bec]"></div>
                                <span className="text-sm font-bold">녹음 중...</span>
                            </div>
                        )}
                        {isUploading && (
                            <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full backdrop-blur-sm border border-green-500/20">
                                <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                                <span className="text-sm font-bold">서버에 저장 중...</span>
                            </div>
                        )}

                        <button
                            onClick={toggleListening}
                            className={`
                                group relative flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95
                                ${isListening
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                    : 'bg-[#135bec] hover:bg-blue-700 shadow-blue-500/30'
                                }
                            `}
                        >
                            <span className="material-symbols-outlined text-white text-[32px]">
                                {isListening ? 'stop' : 'mic'}
                            </span>

                            {/* Ripple Effect Ring */}
                            {isListening && (
                                <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75"></span>
                            )}
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default LiveSttPage;
