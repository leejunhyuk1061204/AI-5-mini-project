import React from 'react';

interface FooterProps {
    onToggleChatbot: () => void;
    isChatbotOpen: boolean;
    showChatbotToggle?: boolean;
}

const Footer: React.FC<FooterProps> = ({ onToggleChatbot, isChatbotOpen, showChatbotToggle = true }) => {
    return (
        <footer className="bg-white border-t border-[#e7ebf3] py-4 px-8 z-20 relative">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                <div className="text-[#4c669a] text-sm">
                    © 2024 AI 회의록. All rights reserved.
                </div>

                {showChatbotToggle && (
                    <button
                        onClick={onToggleChatbot}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${isChatbotOpen
                            ? 'bg-[#135bec] text-white border-transparent hover:bg-blue-700'
                            : 'bg-white text-[#4c669a] border-[#e7ebf3] hover:bg-[#f8faff] hover:text-[#135bec]'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                        <span className="text-sm font-semibold">AI Chat</span>
                    </button>
                )}
            </div>
        </footer>
    );
};

export default Footer;
