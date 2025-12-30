import React, { useState, useEffect, useRef } from 'react';
import type { SttResultData } from '../../types';
// @ts-ignore
import jsPDF from 'jspdf';

interface SttConversionProps {
    fileName: string;
    onCancel: () => void;
    onConversionComplete?: (result: SttResultData) => void;
    initialData?: SttResultData | null;
}

const mockResultData: SttResultData = {
    description: "이번 회의는 다음 주 프로젝트 일정을 조율하고 지난주 진행 상황을 공유하는 것을 목표로 진행되었다. 주요 결정 사항으로는 김팀장이 다음 주 금요일까지 보고서를 제출하기로 했으며, 박대리는 이번 주 안에 고객 문의 답변 작업을 완료해야 한다. 또한 디자인팀은 다음 회의 전까지 새로운 UI 시안을 준비하기로 확정했다. 논의가 필요한 이슈로는 현재 발생한 서버 오류 문제 해결 방안과 로그 분석 과정에서 발견된 데이터 누락 문제가 있었다.",
    core_summary: [
        "다음 주 프로젝트 일정 조율 및 지난주 진행 상황 공유를 주 목적으로 회의를 진행함.",
        "김팀장의 보고서 제출 기한(다음 주 금요일) 및 박대리의 고객 문의 답변 작업 완료(이번 주 내)를 확정함.",
        "디자인팀은 다음 회의 전까지 새로운 UI 시안을 준비하기로 결정됨.",
        "서버 오류 해결 방안 논의와 로그 분석 중 발견된 데이터 누락 문제가 주요 이슈로 확인되어 후속 조치가 필요함."
    ],
    meeting_type: "프로젝트 조정 회의 (Project Coordination)",
    topics: [
        "다음 주 프로젝트 일정 조율",
        "지난주 진행 상황 공유",
        "서버 오류 문제 해결 방안 논의"
    ],
    decisions: [
        "김팀장은 다음 주 금요일까지 보고서를 제출한다.",
        "디자인팀은 새로운 UI 시안을 다음 회의 전까지 준비한다."
    ],
    action_items: [
        "보고서 제출 (김팀장, 다음 주 금요일까지)",
        "고객 문의 답변 작업 마무리 (박대리, 이번 주 안에)",
        "새로운 UI 시안 준비 (디자인팀, 다음 회의 전까지)"
    ],
    pending_items: [
        "서버 오류 문제 해결 방안 논의 필요",
        "로그 분석 과정에서 발견된 데이터 누락 문제"
    ]
};

const SttConversion: React.FC<SttConversionProps> = ({
    fileName,
    onCancel,
    onConversionComplete,
    initialData
}) => {
    // If initialData is provided, start as completed
    const [progress, setProgress] = useState(initialData ? 100 : 0);
    const [status, setStatus] = useState<'processing' | 'completed'>(initialData ? 'completed' : 'processing');
    const [logs, setLogs] = useState([
        { message: '오디오 파일 업로드 완료', status: 'done' },
        { message: '파일 형식 유효성 검사 통과', status: 'done' },
        { message: '음성 텍스트 변환 엔진 초기화 중...', status: 'active' }
    ]);
    const [result, setResult] = useState<SttResultData | null>(initialData || null);
    const resultRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // If we have initialData, skip simulation
        if (initialData) return;

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
    }, [initialData]);

    useEffect(() => {
        // Skip log updates if we already have data
        if (initialData) return;

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
        } else if (progress === 100 && status !== 'completed') {
            setStatus('completed');
            setLogs(prevLogs => [
                ...prevLogs.map(log => ({ ...log, status: 'done' })),
                { message: '변환이 완료되었습니다.', status: 'done' }
            ]);
            setResult(mockResultData);
            // Notify parent
            if (onConversionComplete) {
                onConversionComplete(mockResultData);
            }
        }
    }, [progress, status, onConversionComplete, initialData]);

    const handleExportPDF = async () => {
        if (!resultRef.current) return;

        try {
            const { toPng } = await import('html-to-image');

            // Use lighter background color specifically for capture if needed, 
            // but white is safest for PDF.
            const dataUrl = await toPng(resultRef.current, { cacheBust: true, backgroundColor: '#ffffff' });

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgProps = pdf.getImageProperties(dataUrl);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Simple single page fit logic
            if (imgHeight > pdfHeight) {
                pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgHeight);
            } else {
                pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgHeight);
            }

            pdf.save(`${fileName.replace(/\.[^/.]+$/, "")}_meeting_minutes.pdf`);
        } catch (error) {
            console.error("PDF Export failed:", error);
            alert("PDF 생성을 실패했습니다. (Error: " + error + ")");
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1a2235] rounded-xl shadow-sm border border-[#cfd7e7] dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7ebf3] dark:border-gray-700 bg-[#f8fafc] dark:bg-[#1e293b]">
                <h2 className="text-lg font-bold text-[#0d121b] dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#135bec]">graphic_eq</span>
                    {status === 'completed' ? 'STT 변환 결과' : 'STT 변환 진행상황'}
                </h2>
                <div className="flex items-center gap-3">
                    {status === 'completed' && (
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#135bec] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                        >
                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                            PDF 내보내기
                        </button>
                    )}
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

            <div className="p-6 flex-1 overflow-y-auto" ref={resultRef}>
                <div className="space-y-6">
                    {(status === 'processing' || !result) ? (
                        <>
                            <div className="flex flex-col gap-1 pb-4 border-b border-[#e7ebf3] dark:border-gray-700">
                                <span className="text-sm text-[#4c669a] dark:text-gray-400">현재 작업 중인 파일:</span>
                                <span className="text-base font-semibold text-[#0d121b] dark:text-white truncate" title={fileName}>
                                    {fileName}
                                </span>
                            </div>

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
                        <div className="space-y-8 animate-fade-in">
                            {/* Header Section */}
                            <div className="space-y-3 pb-6 border-b border-[#e7ebf3] dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <span className="bg-[#135bec]/10 text-[#135bec] text-xs font-bold px-2.5 py-1 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                                        {result.meeting_type}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {result.topics.map((topic, idx) => (
                                        <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full dark:bg-gray-800 dark:text-gray-400">
                                            #{topic}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Overview Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-[#0d121b] dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#135bec]">overview</span>
                                    회의 개요
                                </h3>
                                <p className="text-sm leading-relaxed text-[#0d121b] dark:text-gray-300">
                                    {result.description}
                                </p>
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">핵심 요약</h4>
                                    <ul className="space-y-1.5">
                                        {result.core_summary.map((item, idx) => (
                                            <li key={idx} className="flex gap-2 text-sm text-blue-900 dark:text-blue-200">
                                                <span className="text-blue-500 dark:text-blue-400 shrink-0">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Grid Layout for Actionable Items */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Decisions */}
                                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-[#e7ebf3] dark:border-gray-700 shadow-sm">
                                    <h3 className="text-sm font-bold text-[#0d121b] dark:text-white flex items-center gap-2 mb-3">
                                        <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                                        결정 사항
                                    </h3>
                                    <ul className="space-y-3">
                                        {result.decisions.map((item, idx) => (
                                            <li key={idx} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                                <span className="text-green-500 font-bold shrink-0">✓</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Action Items */}
                                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-[#e7ebf3] dark:border-gray-700 shadow-sm">
                                    <h3 className="text-sm font-bold text-[#0d121b] dark:text-white flex items-center gap-2 mb-3">
                                        <span className="material-symbols-outlined text-amber-500 text-[20px]">bolt</span>
                                        조치 필요 사항
                                    </h3>
                                    <ul className="space-y-3">
                                        {result.action_items.map((item, idx) => (
                                            <li key={idx} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                                <span className="text-amber-500 font-bold shrink-0">→</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Pending Items - Full width on mobile, span 2 on desktop if needed or just flow */}
                                <div className="md:col-span-2 p-5 bg-white dark:bg-gray-800 rounded-xl border border-[#e7ebf3] dark:border-gray-700 shadow-sm">
                                    <h3 className="text-sm font-bold text-[#0d121b] dark:text-white flex items-center gap-2 mb-3">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">hourglass_empty</span>
                                        보류 및 논의 필요
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {result.pending_items.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 px-3 py-2 rounded-lg">
                                                <span className="material-symbols-outlined text-[16px]">help</span>
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Full Script Section */}
                            <div className="space-y-2 pt-4 border-t border-[#e7ebf3] dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 cursor-pointer hover:text-[#135bec] transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">description</span>
                                    전체 변환 텍스트 보기
                                </h3>
                                {/* Simple placeholder for now as per design */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-[#e7ebf3] dark:border-gray-700 text-xs text-gray-400 italic">
                                    여기에 전체 대본이 표시됩니다... (현재는 요약 기능 시연 중)
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
