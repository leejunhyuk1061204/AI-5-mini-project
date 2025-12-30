import React, { useState, useEffect } from 'react';

interface SttConversionProps {
    fileName: string;
    onCancel: () => void;
}

const SttConversion: React.FC<SttConversionProps> = ({ fileName, onCancel }) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'processing' | 'completed'>('processing');
    const [logs, setLogs] = useState([
        { message: '오디오 파일 업로드 완료', status: 'done' },
        { message: '파일 형식 유효성 검사 통과', status: 'done' },
        { message: '음성 텍스트 변환 엔진 초기화 중...', status: 'active' }
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 50); // Adjust speed as needed

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (progress === 30) {
            setLogs(prevLogs => [
                ...prevLogs.map(log => ({ ...log, status: 'done' })),
                { message: '음성 데이터 분석 중...', status: 'active' }
            ]);
        } else if (progress === 60) {
            setLogs(prevLogs => [
                ...prevLogs.map(log => ({ ...log, status: 'done' })),
                { message: '텍스트 생성 및 교정 중...', status: 'active' }
            ]);
        } else if (progress === 100) {
            setStatus('completed');
            setLogs(prevLogs => [
                ...prevLogs.map(log => ({ ...log, status: 'done' })),
                { message: '변환이 완료되었습니다.', status: 'done' }
            ]);
        }
    }, [progress]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1a2235] rounded-xl shadow-sm border border-[#cfd7e7] dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7ebf3] dark:border-gray-700 bg-[#f8fafc] dark:bg-[#1e293b]">
                <h2 className="text-lg font-bold text-[#0d121b] dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#135bec]">graphic_eq</span>
                    STT 변환 진행상황
                </h2>
                <div className="flex items-center gap-3">
                    {status === 'processing' ? (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                            처리 중...
                        </span>
                    ) : (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                            완료됨
                        </span>
                    )}
                </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-6">
                    <div className="flex flex-col gap-1 pb-4 border-b border-[#e7ebf3] dark:border-gray-700">
                        <span className="text-sm text-[#4c669a] dark:text-gray-400">현재 작업 중인 파일:</span>
                        <span className="text-base font-semibold text-[#0d121b] dark:text-white truncate" title={fileName}>
                            {fileName}
                        </span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm text-[#4c669a] dark:text-gray-400 mb-1">
                            <span>{status === 'processing' ? '변환 작업 처리 중입니다...' : '변환이 완료되었습니다.'}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div
                                className={`h-2.5 rounded-full transition-all duration-300 ${status === 'completed' ? 'bg-green-500' : 'bg-[#135bec]'}`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-[#f0f4fd] dark:bg-gray-800/50 p-4 rounded-lg border border-[#cfd7e7] dark:border-gray-700">
                        <p className="text-sm text-[#4c669a] dark:text-gray-400 mb-2 font-medium">실시간 로그:</p>
                        <ul className="text-sm space-y-2 text-[#0d121b] dark:text-white font-mono">
                            {logs.map((log, index) => (
                                <li key={index} className={`flex gap-2 ${log.status === 'active' ? 'animate-pulse' : ''}`}>
                                    {log.status === 'done' ? (
                                        <span className="text-green-500">✓</span>
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

            <div className="px-6 py-4 border-t border-[#e7ebf3] dark:border-gray-700 bg-[#f8fafc] dark:bg-[#1e293b] flex justify-end">
                <button
                    onClick={onCancel}
                    className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${status === 'completed'
                            ? 'bg-[#135bec] hover:bg-blue-700 text-white border-transparent shadow-sm'
                            : 'border-[#cfd7e7] dark:border-gray-600 text-[#0d121b] dark:text-white hover:bg-[#f0f2f5] dark:hover:bg-gray-800'
                        }`}
                >
                    {status === 'completed' ? '확인' : '취소'}
                </button>
            </div>
        </div>
    );
};

export default SttConversion;
