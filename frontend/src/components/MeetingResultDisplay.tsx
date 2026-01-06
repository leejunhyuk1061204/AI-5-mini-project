import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import type { SttResultData } from '../types';

interface MeetingResultDisplayProps {
    result: SttResultData;
    fileName: string;
    onClose?: () => void;
    showCloseButton?: boolean;
}

const MeetingResultDisplay: React.FC<MeetingResultDisplayProps> = ({
    result,
    fileName,
    onClose,
}) => {
    const resultRef = useRef<HTMLDivElement>(null);

    const handleExportPDF = async () => {
        if (!resultRef.current) return;

        try {
            const { toPng } = await import('html-to-image');
            const dataUrl = await toPng(resultRef.current, { cacheBust: true, backgroundColor: '#ffffff' });

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgProps = pdf.getImageProperties(dataUrl);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

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
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-[#cfd7e7] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7ebf3] bg-[#f8fafc]">
                <h2 className="text-lg font-bold text-[#0d121b] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#135bec]">graphic_eq</span>
                    STT 변환 결과
                </h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#135bec] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                    >
                        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                        PDF 내보내기
                    </button>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        완료됨
                    </span>
                </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto" ref={resultRef}>
                <div className="space-y-8 animate-fade-in text-left">
                    {/* Header Section */}
                    <div className="space-y-3 pb-6 border-b border-[#e7ebf3]">
                        <div className="flex items-center gap-2">
                            <span className="bg-[#135bec]/10 text-[#135bec] text-xs font-bold px-2.5 py-1 rounded-full">
                                {result.meeting_type || 'General'}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {result.topics && result.topics.filter(t => t.trim()).length > 0 ? (
                                result.topics.filter(t => t.trim()).map((topic, idx) => (
                                    <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                                        #{topic}
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-400 text-xs italic">주제 없음</span>
                            )}
                        </div>
                    </div>

                    {/* Overview Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-[#0d121b] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#135bec]">overview</span>
                            회의 개요
                        </h3>
                        <p className="text-sm leading-relaxed text-[#0d121b]">
                            {result.description}
                        </p>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">핵심 요약</h4>
                            <ul className="space-y-1.5">
                                {result.core_summary && result.core_summary.filter(t => t.trim()).length > 0 ? (
                                    result.core_summary.filter(t => t.trim()).map((item, idx) => (
                                        <li key={idx} className="flex gap-2 text-sm text-blue-900">
                                            <span className="text-blue-500 shrink-0">•</span>
                                            {item}
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-gray-400 text-sm italic">요약된 내용이 없습니다.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Grid Layout for Actionable Items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Decisions */}
                        <div className="p-5 bg-white rounded-xl border border-[#e7ebf3] shadow-sm">
                            <h3 className="text-sm font-bold text-[#0d121b] flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                                결정 사항
                            </h3>
                            <ul className="space-y-3">
                                {result.decisions && result.decisions.filter(t => t.trim()).length > 0 ? (
                                    result.decisions.filter(t => t.trim()).map((item, idx) => (
                                        <li key={idx} className="flex gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                                            <span className="text-green-500 font-bold shrink-0">✓</span>
                                            {item}
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-gray-400 text-sm italic py-2">결정된 사항이 없습니다.</li>
                                )}
                            </ul>
                        </div>

                        {/* Action Items */}
                        <div className="p-5 bg-white rounded-xl border border-[#e7ebf3] shadow-sm">
                            <h3 className="text-sm font-bold text-[#0d121b] flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-amber-500 text-[20px]">bolt</span>
                                조치 필요 사항
                            </h3>
                            <ul className="space-y-3">
                                {result.action_items && result.action_items.filter(t => t.trim()).length > 0 ? (
                                    result.action_items.filter(t => t.trim()).map((item, idx) => (
                                        <li key={idx} className="flex gap-3 text-sm text-gray-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                            <span className="text-amber-500 font-bold shrink-0">→</span>
                                            {item}
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-gray-400 text-sm italic py-2">조치 필요 사항이 없습니다.</li>
                                )}
                            </ul>
                        </div>

                        {/* Pending Items */}
                        <div className="md:col-span-2 p-5 bg-white rounded-xl border border-[#e7ebf3] shadow-sm">
                            <h3 className="text-sm font-bold text-[#0d121b] flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-gray-400 text-[20px]">hourglass_empty</span>
                                보류 및 논의 필요
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {result.pending_items && result.pending_items.filter(t => t.trim()).length > 0 ? (
                                    result.pending_items.filter(t => t.trim()).map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                                            <span className="material-symbols-outlined text-[16px]">help</span>
                                            {item}
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-gray-400 text-sm italic py-2">보류된 사항이 없습니다.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Full Script Section */}
                    <div className="space-y-2 pt-4 border-t border-[#e7ebf3]">
                        <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2 cursor-pointer hover:text-[#135bec] transition-colors">
                            <span className="material-symbols-outlined text-[18px]">description</span>
                            전체 변환 텍스트 보기
                        </h3>
                        <div className="p-4 bg-gray-50 rounded-lg border border-[#e7ebf3] text-sm text-gray-700 max-h-64 overflow-y-auto whitespace-pre-wrap">
                            {result.fullText ? (
                                result.fullText.split('\n').map((line, idx) => (
                                    <p key={idx} className="mb-1">{line}</p>
                                ))
                            ) : (
                                <span className="text-gray-400 italic">전체 텍스트가 없습니다.</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-[#e7ebf3] bg-[#f8fafc] flex justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-[#135bec] hover:bg-blue-700 text-white text-sm font-semibold border-transparent shadow-sm transition-colors"
                >
                    확인
                </button>
            </div>
        </div>
    );
};

export default MeetingResultDisplay;
