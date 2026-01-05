import React from 'react';
import type { HistoryItem } from '../types';

interface SidebarProps {
    history: HistoryItem[];
    onSelectHistory: (id: string) => void;
    onDelete?: (id: string) => void;
    onToggle?: () => void;
    isOpen?: boolean;
    currentHistoryId?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
    history,
    onSelectHistory,
    onDelete,
    onToggle,
    isOpen = true,
    currentHistoryId
}) => {
    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[59] bg-black/20 backdrop-blur-sm md:hidden"
                    onClick={onToggle}
                />
            )}

            <aside
                className={`
                    fixed inset-y-0 left-0 z-[60] bg-white h-full flex flex-col transition-all duration-300 overflow-hidden border-r border-[#e7ebf3] shadow-lg md:shadow-none
                    md:relative md:translate-x-0
                    ${isOpen ? 'translate-x-0 w-[320px]' : '-translate-x-full w-0 md:w-0 md:opacity-0'}
                `}
            >
                {/* Header */}
                <div className="p-4 border-b border-[#e7ebf3] bg-gray-50 flex justify-between items-center shrink-0">
                    <span className="font-bold text-[#0d121b]">기록 ({history.length})</span>
                    {onToggle && (
                        <button
                            onClick={onToggle}
                            className="p-1 rounded-md hover:bg-gray-200 text-[#444746] transition-colors"
                            title="접기"
                        >
                            <span className="material-symbols-outlined text-[20px]">keyboard_double_arrow_left</span>
                        </button>
                    )}
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-10">
                            <span className="material-symbols-outlined text-4xl">folder_off</span>
                            <p className="text-sm">저장된 기록이 없습니다.</p>
                        </div>
                    ) : (
                        history.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    onSelectHistory(item.id);
                                    if (window.innerWidth < 768 && onToggle) {
                                        // Mobile: Close on select? Optional.
                                        // onToggle(); 
                                    }
                                }}
                                className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${currentHistoryId === item.id
                                    ? 'bg-blue-50 border-[#135bec] shadow-sm'
                                    : 'bg-white border-[#e7ebf3] hover:border-[#135bec]/50 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1 text-left">
                                    <h3 className={`font-bold text-sm truncate pr-6 ${currentHistoryId === item.id ? 'text-[#135bec]' : 'text-[#0d121b]'}`}>
                                        {item.title}
                                    </h3>
                                    {onDelete && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('정말 삭제하시겠습니까?')) {
                                                    onDelete(item.id);
                                                }
                                            }}
                                            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded transition-all opacity-0 group-hover:opacity-100"
                                            title="삭제"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-[#4c669a]">
                                    <span className="flex items-center gap-1">
                                        {new Date(item.date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
