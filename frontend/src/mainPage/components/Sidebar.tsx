import React, { useState } from 'react';
import type { HistoryItem } from '../../types';

interface SidebarProps {
    history: HistoryItem[];
    onSelectHistory: (id: string) => void;
    isOpen?: boolean;
    currentHistoryId?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
    history,
    onSelectHistory,
    isOpen = true,
    currentHistoryId
}) => {
    const [isRecentExpanded, setIsRecentExpanded] = useState(true);

    return (
        <aside
            className={`
                bg-[#f0f4f9] dark:bg-[#1e1f20] h-screen flex flex-col transition-all duration-300 overflow-hidden border-r border-[#e7ebf3] dark:border-gray-700
                ${isOpen ? 'w-[280px] min-w-[280px]' : 'w-0 min-w-0 opacity-0'}
            `}
        >
            {/* History List */}
            <div className="flex-1 overflow-y-auto px-2 py-4">
                <button
                    onClick={() => setIsRecentExpanded(!isRecentExpanded)}
                    className="flex items-center gap-2 w-full px-3 py-2 mb-1 hover:bg-[#e7ebf0] dark:hover:bg-[#282a2c] rounded-lg transition-colors group"
                >
                    <span className="text-xs font-medium text-[#444746] dark:text-[#c4c7c5] flex-1 text-left">최근 활동</span>
                    <span className={`material-symbols-outlined text-[16px] text-[#444746] dark:text-[#c4c7c5] transition-transform duration-200 ${isRecentExpanded ? 'rotate-0' : '-rotate-90'}`}>
                        expand_more
                    </span>
                </button>

                <div className={`flex flex-col gap-1 transition-all duration-300 origin-top overflow-hidden ${isRecentExpanded ? 'opacity-100 max-h-[5000px]' : 'opacity-0 max-h-0'}`}>
                    {history.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-[#444746] dark:text-[#8e918f] text-center">
                            아직 저장된 회의록이 없습니다.
                        </div>
                    ) : (
                        history.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSelectHistory(item.id)}
                                className={`
                                    group flex items-center gap-3 px-3 py-2 rounded-full text-left transition-colors w-full
                                    ${currentHistoryId === item.id
                                        ? 'bg-[#d3e3fd] dark:bg-[#004a77] text-[#0b57d0] dark:text-[#c2e7ff]'
                                        : 'text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#e7ebf0] dark:hover:bg-[#282a2c]'
                                    }
                                `}
                            >
                                <span className="material-symbols-outlined text-[18px] shrink-0">chat_bubble</span>
                                <span className="text-sm truncate flex-1">{item.title}</span>
                                {/* Optional: showing date on hover or always could be nice, keeping simple for now */}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
