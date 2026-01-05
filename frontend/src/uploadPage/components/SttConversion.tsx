import React, { useState, useEffect, useRef } from 'react';
import type { SttResultData, MeetingUploadResponse } from '../../types';
import MeetingResultDisplay from '../../components/MeetingResultDisplay';
import { parseSummaryMarkdown } from '../../utils/meetingUtils';

interface SttConversionProps {
    fileName: string;
    file?: File | null; // 실제 업로드할 파일
    onCancel: () => void;
    onConversionComplete?: (result: SttResultData, meetingId?: number) => void;
    initialData?: SttResultData | null;
}

const SttConversion: React.FC<SttConversionProps> = ({
    fileName,
    file,
    onCancel,
    onConversionComplete,
    initialData
}) => {
    // If initialData is provided, start as completed
    const [progress, setProgress] = useState(initialData ? 100 : 0);
    const [status, setStatus] = useState<'processing' | 'completed' | 'error'>(initialData ? 'completed' : 'processing');
    const [logs, setLogs] = useState([
        { message: '오디오 파일 업로드 준비 중...', status: 'active' }
    ]);
    const [result, setResult] = useState<SttResultData | null>(initialData || null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const apiCalledRef = useRef(false);

    // Real API call
    useEffect(() => {
        if (initialData || !file || apiCalledRef.current) return;
        apiCalledRef.current = true;

        const uploadAndAnalyze = async () => {
            try {
                setLogs([{ message: '서버에 파일 업로드 중...', status: 'active' }]);
                setProgress(10);

                const formData = new FormData();
                formData.append('file', file);
                formData.append('title', fileName);
                formData.append('memberId', localStorage.getItem('memberId') || '1');

                setLogs(prev => [...prev.map(l => ({ ...l, status: 'done' })), { message: 'AI 분석 진행 중... (화자분리, 요약)', status: 'active' }]);
                setProgress(30);

                const response = await fetch('/api/meetings/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`서버 오류 (${response.status}): ${errText}`);
                }

                setProgress(80);
                setLogs(prev => [...prev.map(l => ({ ...l, status: 'done' })), { message: '분석 결과 처리 중...', status: 'active' }]);

                const apiResponse: { data: MeetingUploadResponse } = await response.json();
                const meeting = apiResponse.data;

                // [추가] 서버에서 온 원본 summary 확인용 로그
                console.log("원본 summary:", meeting.summary);

                // Parse summary markdown into structured data
                const parsedResult = parseSummaryMarkdown(meeting.summary, meeting.fullText);

                setProgress(100);
                setStatus('completed');
                setResult(parsedResult);
                setLogs(prev => [...prev.map(l => ({ ...l, status: 'done' })), { message: '✅ 변환이 완료되었습니다.', status: 'done' }]);

                if (onConversionComplete) {
                    onConversionComplete(parsedResult, meeting.meetingId);
                }
            } catch (err) {
                console.error('[SttConversion] Upload failed:', err);
                setStatus('error');
                setErrorMessage(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
                setLogs(prev => [...prev.map(l => ({ ...l, status: 'done' })), { message: `❌ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`, status: 'error' }]);
            }
        };

        uploadAndAnalyze();
    }, [file, fileName, initialData, onConversionComplete]);

    if (status === 'completed' && result) {
        return (
            <MeetingResultDisplay
                result={result}
                fileName={fileName}
                onClose={onCancel}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-[#cfd7e7] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7ebf3] bg-[#f8fafc]">
                <h2 className="text-lg font-bold text-[#0d121b] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#135bec]">graphic_eq</span>
                    STT 변환 진행상황
                </h2>
                <div className="flex items-center gap-3">
                    {status === 'processing' ? (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            처리 중...
                        </span>
                    ) : (
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            오류 발생
                        </span>
                    )}
                </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-6">
                    <div className="flex flex-col gap-1 pb-4 border-b border-[#e7ebf3]">
                        <span className="text-sm text-[#4c669a]">현재 작업 중인 파일:</span>
                        <span className="text-base font-semibold text-[#0d121b] truncate" title={fileName}>
                            {fileName}
                        </span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm text-[#4c669a] mb-1">
                            <span>{status === 'error' ? '오류가 발생했습니다' : '변환 작업 처리 중입니다...'}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className={`h-2.5 rounded-full transition-all duration-300 ${status === 'error' ? 'bg-red-500' : 'bg-[#135bec]'}`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    {status === 'error' && errorMessage && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <p className="text-sm text-red-700 font-medium">오류 상세:</p>
                            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
                        </div>
                    )}

                    <div className="bg-[#f0f4fd] p-4 rounded-lg border border-[#cfd7e7]">
                        <p className="text-sm text-[#4c669a] mb-2 font-medium">실시간 로그:</p>
                        <ul className="text-sm space-y-2 text-[#0d121b] font-mono">
                            {logs.map((log, index) => (
                                <li key={index} className={`flex gap-2 ${log.status === 'active' ? 'animate-pulse' : ''}`}>
                                    {log.status === 'done' ? (
                                        <span className="text-green-500">✓</span>
                                    ) : log.status === 'error' ? (
                                        <span className="text-red-500">✕</span>
                                    ) : (
                                        <span className="text-[#135bec]">➜</span>
                                    )}
                                    {log.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-[#e7ebf3] bg-[#f8fafc] flex justify-end">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg border border-[#cfd7e7] text-[#0d121b] hover:bg-[#f0f2f5] text-sm font-semibold transition-colors"
                >
                    취소
                </button>
            </div>
        </div>
    );
};

export default SttConversion;
