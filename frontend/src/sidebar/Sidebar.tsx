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
    // const [isRecentExpanded, setIsRecentExpanded] = useState(true); // Removed as always expanded

    return (
        <>
            {/* Open Sidebar Button (Hamburger) - Only visible when sidebar is closed */}
            {!isOpen && onToggle && (
                <button
                    onClick={onToggle}
                    className="absolute top-7 left-6 z-50 p-2 rounded-lg hover:bg-[#e7ebf0] text-[#444746] transition-colors backdrop-blur-sm"
                    title="사이드바 열기"
                >
                    <span className="material-symbols-outlined text-[24px]">menu</span>
                </button>
            )}

            <aside
                className={`
                    bg-[#f0f4f9] h-full min-h-[600px] flex flex-col transition-all duration-300 overflow-hidden border-r border-[#e7ebf3] relative
                    ${isOpen ? 'w-[280px] min-w-[280px]' : 'w-0 min-w-0 opacity-0'}
                `}
            >
                {/* History List */}
                <div className="flex-1 overflow-y-auto px-2 py-4">
                    <div className="flex items-center justify-between mb-1 px-3 py-2">
                        <span className="text-xs font-medium text-[#444746]">최근 활동</span>

                        {onToggle && (
                            <button
                                onClick={onToggle}
                                className="p-1 rounded-md hover:bg-[#e7ebf0] text-[#444746] transition-colors"
                                title="사이드바 접기"
                            >
                                <span className="material-symbols-outlined text-[20px]">keyboard_double_arrow_left</span>
                            </button>
                        )}
                    </div>

                    {/* The history list will now always be expanded as the toggle button is removed */}
                    <div className={`flex flex-col gap-1 transition-all duration-300 origin-top overflow-hidden opacity-100 max-h-[5000px]`}>
                        {history.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-[#444746] text-center">
                                아직 저장된 회의록이 없습니다.
                            </div>
                        ) : (
                            history.map((item) => (
                                <div key={item.id} className="relative group">
                                    <button
                                        onClick={() => onSelectHistory(item.id)}
                                        className={`
                                        flex items-center gap-3 px-3 py-2 rounded-full text-left transition-colors w-full
                                        ${currentHistoryId === item.id
                                                ? 'bg-[#d3e3fd] text-[#0b57d0]'
                                                : 'text-[#1f1f1f] hover:bg-[#e7ebf0]'
                                            }
                                    `}
                                    >
                                        <span className="material-symbols-outlined text-[18px] shrink-0">chat_bubble</span>
                                        <span className="text-sm truncate flex-1 pr-6">{item.title}</span>
                                    </button>

                                    {onDelete && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('정말 삭제하시겠습니까?')) {
                                                    onDelete(item.id);
                                                }
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all z-10"
                                            title="삭제"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>



            </aside >
        </>
    );
};

export default Sidebar;
