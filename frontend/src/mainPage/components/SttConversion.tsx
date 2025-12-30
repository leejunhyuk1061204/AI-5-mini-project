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
    const [result, setResult] = useState<{ transcription: string; summary: string } | null>(null);

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
            setResult({
                transcription: "이번 회의에서는 AI 미니 프로젝트의 프론트엔드 구조에 대해 논의했습니다. 주요 안건으로는 파일 업로드 기능과 STT 변환 상태 표시창 구현이 있었습니다. 또한, 사용자 경험을 개선하기 위해 드래그 앤 드롭 기능과 파일 리스트 관리 기능을 추가하기로 결정했습니다. 프로젝트 초기 설정 단계에서 Vite와 TailwindCSS를 도입하여 개발 효율성을 높이는 것에 모두 동의했습니다.",
                summary: "- AI 미니 프로젝트 프론트엔드 구조 논의\n- 파일 업로드 및 STT 변환 상태 표시 기능 구현 계획\n- UX 개선을 위한 드래그 앤 드롭 및 리스트 관리 기능 추가\n- Vite 및 TailwindCSS 도입 결정"
            });
        }
    }, [progress]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1a2235] rounded-xl shadow-sm border border-[#cfd7e7] dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7ebf3] dark:border-gray-700 bg-[#f8fafc] dark:bg-[#1e293b]">
                <h2 className="text-lg font-bold text-[#0d121b] dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#135bec]">graphic_eq</span>
                    {status === 'completed' ? 'STT 변환 결과' : 'STT 변환 진행상황'}
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

                    {status === 'processing' ? (
                        <>
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-sm text-[#4c669a] dark:text-gray-400 mb-1">
                                    <span>변환 작업 처리 중입니다...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                    <div
                                        className="h-2.5 rounded-full transition-all duration-300 bg-[#135bec]"
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
                        </>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-2">
                                <h3 className="text-base font-bold text-[#0d121b] dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#135bec]">description</span>
                                    변환된 텍스트
                                </h3>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-[#e7ebf3] dark:border-gray-700 max-h-[200px] overflow-y-auto">
                                    <p className="text-sm leading-relaxed text-[#0d121b] dark:text-gray-300">
                                        {result?.transcription}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-base font-bold text-[#0d121b] dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#135bec]">auto_awesome</span>
                                    AI 핵심 요약
                                </h3>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <div className="text-sm leading-relaxed text-[#0d121b] dark:text-gray-300 whitespace-pre-line">
                                        {result?.summary}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
