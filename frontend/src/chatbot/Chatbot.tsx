import React, { useState } from 'react';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<{ id: number; text: string; isUser: boolean }[]>([
        { id: 1, text: "안녕하세요! 무엇을 도와드릴까요?", isUser: false },
        { id: 2, text: "회의록 요약이나 검색을 도와드릴 수 있습니다.", isUser: false }
    ]);
    const [inputValue, setInputValue] = useState("");

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;
        setMessages(prev => [...prev, { id: Date.now(), text: inputValue, isUser: true }]);
        setInputValue("");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    // if (!isOpen) return null; // Removed to support transition

    return (
        <div
            className={`
                flex flex-col h-full border-l border-[#e7ebf3] bg-white transition-all duration-300 overflow-hidden relative
                ${isOpen ? 'w-[350px] min-w-[350px] opacity-100' : 'w-0 min-w-0 opacity-0'}
            `}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7ebf3] bg-[#f8faff] min-w-[350px]">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#135bec]">smart_toy</span>
                    <span className="font-bold text-[#0d121b]">AI Assistant</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-[#e7ebf0] text-[#444746] transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fc] min-w-[350px]">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${msg.isUser
                                ? 'bg-[#135bec] text-white rounded-tr-none'
                                : 'bg-white border border-[#e7ebf3] text-[#0d121b] rounded-tl-none shadow-sm'
                                }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-[#e7ebf3] min-w-[350px]">
                <div className="flex items-center gap-2 bg-[#f0f4f9] px-3 py-2 rounded-full border border-transparent focus-within:border-[#135bec] transition-colors">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="메시지를 입력하세요..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-[#0d121b] placeholder-[#444746]"
                    />
                    <button
                        onClick={handleSendMessage}
                        className={`p-1.5 rounded-full transition-colors ${inputValue.trim()
                            ? 'bg-[#135bec] text-white hover:bg-blue-700'
                            : 'bg-[#e7ebf0] text-[#9aa6c2] cursor-not-allowed'
                            }`}
                        disabled={!inputValue.trim()}
                    >
                        <span className="material-symbols-outlined text-[18px] leading-none flex items-center justify-center">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
