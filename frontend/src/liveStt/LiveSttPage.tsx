import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL, JAVA_WS_URL } from '../config';
import { useMeetingContext } from '../context/MeetingContext';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
    const { setCurrentMeetingId: setContextMeetingId } = useMeetingContext();
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
    const isIntentionalStop = useRef(false);

    // MediaRecorder for audio recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    // WebSocket for real-time audio streaming
    const wsRef = useRef<WebSocket | null>(null);
    // JAVA_WS_URL is imported from config



    // meetingId를 URL 파라미터에서 읽음 (예: /live?meetingId=1)
    const meetingIdParam = new URLSearchParams(window.location.search).get('meetingId');
    const [currentMeetingId, setCurrentMeetingId] = useState<number | null>(
        meetingIdParam ? Number(meetingIdParam) : null
    );
    // 챗봇용 meetingId (녹음 종료 후에도 유지)
    const [lastMeetingId, setLastMeetingId] = useState<number | null>(
        meetingIdParam ? Number(meetingIdParam) : null
    );



    const [summary, setSummary] = useState<string | null>(tempData?.summary || null);
    const [isSummarizing, setIsSummarizing] = useState(false);

    // Sync context meeting ID
    useEffect(() => {
        if (lastMeetingId) {
            setContextMeetingId(lastMeetingId);
        }
    }, [lastMeetingId, setContextMeetingId]);

    // Auto-save temp data
    useEffect(() => {

        if (transcripts.length === 0 && !summary) {
            localStorage.removeItem('live_stt_temp');
            return;
        }

        const dataToSave = {
            transcripts,
            summary
        };
        localStorage.setItem('live_stt_temp', JSON.stringify(dataToSave));
    }, [transcripts, summary]);



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
                // 의도적으로 멈춘 게 아니라면 (엔진 자동 종료 등) 다시 시작
                if (!isIntentionalStop.current) {
                    try {
                        recognition.start();
                        console.log('SpeechRecognition 자동 재시작');
                    } catch (e) {
                        console.error('재시작 실패:', e);
                        setIsListening(false);
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
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        } else {
            alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Safari를 사용해주세요.');
        }

        return () => {
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
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    // WebSocket Reconnection Logic
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;

    // Connect WebSocket for audio streaming
    const connectWebSocket = useCallback((meetingId: number) => {
        return new Promise<WebSocket>((resolve, reject) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                resolve(wsRef.current);
                return;
            }

            const wsUrl = `${JAVA_WS_URL}/ws/audio?meetingId=${meetingId}`;
            console.log("WS 연결 시도:", wsUrl, "meetingId:", meetingId);

            const ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';

            ws.onopen = () => {
                console.log('WebSocket 연결됨');
                wsRef.current = ws;
                reconnectAttemptsRef.current = 0; // Reset attempts on success
                // UI 알림 (Connection restored)
                const toast = document.getElementById('connection-toast');
                if (toast) toast.style.display = 'none';
                resolve(ws);
            };

            ws.onclose = (e) => {
                console.log('WebSocket 종료됨', e.code, e.reason, "url=", ws.url);
                wsRef.current = null;

                // 비정상 종료이고, 재시도 횟수가 남았으며, 녹음 중일 때
                if (!isIntentionalStop.current && isListening && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 5000);
                    reconnectAttemptsRef.current++;

                    // UI 알림 (Reconnecting...)
                    const toast = document.getElementById('connection-toast');
                    if (toast) {
                        toast.style.display = 'flex';
                        toast.innerText = `서버 연결이 끊겨 재전송합니다... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`;
                    }

                    console.log(`재연결 시도 ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectWebSocket(meetingId).catch(err => console.error("재연결 실패", err));
                    }, delay);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                // 에러 발생 시에도 onclose가 호출되므로 거기서 처리
                reject(error);
            };
        });
    }, [isListening]);

    // Disconnect WebSocket
    const disconnectWebSocket = useCallback(() => {
        isIntentionalStop.current = true; // 명시적 종료 표시
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
            console.log('WebSocket 연결 해제됨');
        }
    }, []);

    // Start MediaRecorder
    const startMediaRecorder = async (meetingId: number) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            await connectWebSocket(meetingId);

            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                console.warn("WS 아직 OPEN 아님. 녹음을 시작할 수 없습니다.");
                // stream 정리
                stream.getTracks().forEach(t => t.stop());
                mediaStreamRef.current = null;
                return;
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(event.data);
                        console.log(`오디오 청크 전송: ${event.data.size} bytes`);
                    } else {
                        console.warn("WS 아직 OPEN 아님. 청크 전송 스킵");
                    }
                }
            };

            mediaRecorder.onstop = () => {
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach(track => track.stop());
                    mediaStreamRef.current = null;
                }

                // 마지막 청크까지 처리된 뒤 WebSocket 종료
                disconnectWebSocket();

                mediaRecorderRef.current = null;
                console.log('MediaRecorder 완전히 정지됨');

                // 녹음 정지 시 미팅 ID 초기화 (다음 녹음 때 새 미팅 생성을 위해)
                setCurrentMeetingId(null);
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('meetingId');
                window.history.pushState({}, '', newUrl.toString());

                // 녹음 종료 후 다운로드 확인
                setTimeout(() => {
                    if (window.confirm('녹음한 후에 파일 다운로드 하시겠습니까?')) {

                        const downloadUrl = `${API_URL}/files/download/${meetingId}`; // 여기서 meetingId는 클로저로 전달된 값
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = `meeting_${meetingId}.webm`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                }, 100);
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
            console.log('MediaRecorder 정지 요청됨');
        }
    };

    const createMeeting = async (): Promise<number | null> => {
        const memberIdStr = localStorage.getItem('memberId');
        if (!memberIdStr) {
            alert('로그인이 필요합니다.');
            // 여기서 로그인 페이지로 이동하거나 할 수 있음
            return null;
        }

        try {
            const memberId = parseInt(memberIdStr, 10);
            const title = `새 회의 (${new Date().toLocaleString()})`;


            const res = await fetch(`${API_URL}/meetings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },

                body: JSON.stringify({ memberId, title })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error('회의 생성 실패 response:', res.status, errorData);
                throw new Error(`회의 생성 실패 (Status: ${res.status})`);
            }

            const data = await res.json();
            const newMeetingId = data.data.meetingId;
            console.log('새 회의 생성됨:', newMeetingId);
            return newMeetingId;

        } catch (e) {
            console.error('회의 생성 중 상세 오류:', e);
            alert(`회의를 생성할 수 없습니다: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
            return null;
        }
    };

    const toggleListening = async () => {
        if (isListening) {
            isIntentionalStop.current = true; // 의도적 중지임을 표시하여 자동 재시작 방지
            recognitionRef.current?.stop();
            stopMediaRecorder();
        } else {
            isIntentionalStop.current = false; // 시작 시 플래그 초기화
            let targetMeetingId = currentMeetingId;

            if (true) { // 무조건 새 미팅 생성 (기존 targetMeetingId 체크 로직 제거)
                const newId = await createMeeting();
                if (!newId) return;
                targetMeetingId = newId;
                setCurrentMeetingId(newId);
                setLastMeetingId(newId); // 챗봇용 meetingId 업데이트
                setSummary(null);

                // URL 업데이트 (새로고침 시 유지용)
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('meetingId', String(newId));
                window.history.pushState({}, '', newUrl.toString());
            }

            if (targetMeetingId) {
                recognitionRef.current?.start();
                await startMediaRecorder(targetMeetingId);
            }
        }
    };


    // Clear transcript and meeting from DB


    const handleClear = async () => {
        if (isListening) {
            alert('녹음 중에는 삭제할 수 없습니다. 먼저 녹음을 중지해주세요.');
            return;
        }


        const hasContent = transcripts.length > 0 || summary || interimTranscript;
        if (!lastMeetingId && !hasContent) {
            alert('삭제할 기록이 없습니다.');
            return;
        }

        const confirmMsg = lastMeetingId
            ? '정말로 기록을 삭제하시겠습니까? 데이터베이스에서도 영구 삭제됩니다.'
            : '화면에 표시된 내용을 삭제하시겠습니까?';

        if (!window.confirm(confirmMsg)) return;

        try {
            // Remove local storage explicitly
            localStorage.removeItem('live_stt_temp');

            if (lastMeetingId) {
                await fetch(`${API_URL}/meetings/${lastMeetingId}`, {
                    method: 'DELETE',
                });

            }
            // Reset all states
            setTranscripts([]);
            setInterimTranscript('');
            setSummary(null);
            setLastMeetingId(null);
            setCurrentMeetingId(null);

            // Clear meetingId from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('meetingId');
            window.history.pushState({}, '', url.toString());

            alert('삭제되었습니다.');
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const handleSave = async () => {
        if (isListening) {
            alert('녹음 중에는 저장할 수 없습니다. 먼저 녹음을 중지해주세요.');
            return;
        }
        if (!lastMeetingId) {
            alert('저장할 회의 정보가 없습니다. 대화를 시작해주세요.');
            return;
        }

        setIsSummarizing(true);
        try {
            // 분석이 안 되어 있을 수 있으므로 retry API 호출 (Background)

            await fetch(`${API_URL}/meetings/${lastMeetingId}/retry`, {
                method: 'POST',
            });


            alert('회의록이 저장되었습니다. 히스토리에서 확인하실 수 있습니다.');
            navigate('/history');

            // Reset state and session
            setTranscripts([]);
            setInterimTranscript('');
            setSummary(null);
            setLastMeetingId(null);
            setCurrentMeetingId(null);

            const url = new URL(window.location.href);
            url.searchParams.delete('meetingId');
            window.history.pushState({}, '', url.toString());

        } catch (e) {
            console.error('Save error:', e);
            alert('저장에 실패했습니다.');
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleSummarize = async () => {
        if (isListening) {
            alert('녹음 중에는 요약할 수 없습니다. 먼저 녹음을 중지해주세요.');
            return;
        }
        if (!lastMeetingId) {
            alert('요약할 회의 정보가 없습니다. 대화를 시작해주세요.');
            return;
        }

        setIsSummarizing(true);
        try {

            // 90초 타임아웃 설정 (LLM 응답 대기 시간 충분히 확보)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000);


            // retry API를 사용하여 수동 분석 트리거
            const response = await fetch(`${API_URL}/meetings/${lastMeetingId}/fast-summary`, {
                method: 'POST',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('분석 요청에 실패했습니다.');

            const data = await response.json();
            const meeting = data.data;

            if (meeting.summary && meeting.summary !== '요약 생성 실패') {
                setSummary(meeting.summary);
                // resultData는 정밀분석 완료 시에만 사용하기 위해 여기서는 설정하지 않음
            } else {
                alert('AI 분석 결과가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
            }
        } catch (e) {
            console.error('Failed to fetch summary', e);

            if (e instanceof Error && e.name === 'AbortError') {
                alert('AI 요약 생성에 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요.');
            } else {
                alert('요약 정보를 가져오는데 실패했습니다.');
            }
        } finally {
            setIsSummarizing(false);
        }
    };



    return (
        <div className="relative flex h-full w-full flex-row overflow-hidden bg-[#f6f6f8] font-['Inter',sans-serif] text-[#0d121b] antialiased">
            {/* Sidebar removed */}

            <main className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
                {/* Connection Toast Notification */}
                <div
                    id="connection-toast"
                    className="hidden absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold items-center gap-2 animate-bounce"
                >
                    <span className="material-symbols-outlined text-[18px]">wifi_off</span>
                    <span>서버 연결 끊김. 재연결 중...</span>
                </div>

                <div className="flex-1 flex flex-col max-w-[960px] mx-auto w-full p-4 md:p-8 pt-2 md:pt-8 min-h-0 overflow-hidden">

                    {/* Header */}
                    <div className="flex flex-col items-start gap-4 mb-4 md:flex-row md:justify-between md:items-center">
                        <div className="flex items-center gap-4">


                            <div>
                                <h1 className="text-[#0d121b] text-2xl md:text-3xl font-black tracking-tight mb-1 md:mb-2">실시간 회의록</h1>
                                <p className="text-[#4c669a] text-xs md:text-sm">마이크를 켜고 회의를 시작하세요. AI가 실시간으로 기록합니다.</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                            <button
                                onClick={handleSummarize}
                                disabled={isSummarizing}
                                className={`px-3 py-2 md:px-4 text-sm font-bold text-white rounded-lg transition-all shadow-sm flex items-center gap-2 whitespace-nowrap shrink-0
                                    ${isSummarizing
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
                                disabled={isSummarizing}
                                className="px-3 py-2 md:px-4 text-sm font-bold text-white bg-[#135bec] hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0"
                            >
                                저장하기
                            </button>
                            <button
                                onClick={handleClear}
                                disabled={isSummarizing}
                                className="px-3 py-2 md:px-4 text-sm font-bold text-[#444746] bg-white hover:bg-gray-50 border border-[#c4c7c5] rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:bg-gray-100 whitespace-nowrap shrink-0"
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
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-[#135bec]">
                                        <span className="material-symbols-outlined">auto_awesome</span>
                                        <h3 className="font-bold text-lg">AI 실시간 브리핑</h3>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-medium">
                                        실시간 데이터 기반 브리핑입니다.
                                    </span>
                                </div>
                                <div className="bg-white rounded-2xl p-8 border border-[#e7ebf3] shadow-md hover:shadow-lg transition-shadow">
                                    {isSummarizing ? (
                                        <div className="flex items-center gap-3 text-[#4c669a]">
                                            <div className="w-5 h-5 border-2 border-[#135bec]/30 border-t-[#135bec] rounded-full animate-spin"></div>
                                            <span className="font-medium">회의 내용을 분석하여 브리핑을 생성하고 있습니다...</span>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm max-w-none text-[#0d121b]">
                                            {summary?.split('\n').map((line, i) => {
                                                const trimmed = line.trim();
                                                // 제목, 알림, 안내 문구, 구분선 성격의 라인은 아예 렌더링하지 않음
                                                if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) return null;
                                                if (trimmed.startsWith('> ') || trimmed.includes('알림')) return null;
                                                if (trimmed.startsWith('*') || trimmed.includes('저장하기')) return null; // 안내 문구 필터링
                                                if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) return <li key={i} className="ml-4 mb-1 list-disc marker:text-[#135bec]">{trimmed.replace(/^[-•]\s*/, '')}</li>;
                                                if (trimmed === '---') return null;
                                                return trimmed ? <p key={i} className="mb-2 leading-relaxed">{trimmed}</p> : null;
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 text-right">
                                    <span className="text-[11px] text-gray-400 font-medium italic">
                                        ※ 전체 세부 회의록과 화자 분석 결과는 [저장하기] 후에 확인하실 수 있습니다.
                                    </span>
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
